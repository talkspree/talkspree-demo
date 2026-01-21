-- ============================================================================
-- Matchmaking support: stats RPC and similarity-based pairing
-- ============================================================================

-- Global stats (security definer to bypass RLS and allow counts)
DROP FUNCTION IF EXISTS get_matchmaking_stats(UUID);

CREATE OR REPLACE FUNCTION get_matchmaking_stats(current_user_id UUID)
RETURNS TABLE (waiting_count BIGINT, chatting_users BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Waiting users excluding current
  SELECT COUNT(*) INTO waiting_count
  FROM matchmaking_queue
  WHERE status = 'waiting'
    AND (current_user_id IS NULL OR user_id <> current_user_id);

  -- Active calls * 2 (two participants per call)
  SELECT COALESCE(COUNT(*), 0) * 2 INTO chatting_users
  FROM call_history
  WHERE status = 'ongoing';

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION get_matchmaking_stats(UUID) IS
'Returns waiting queue count (excluding caller) and active chatting users (ongoing calls * 2).';

-- Update attempt_match to use similarity ordering when multiple partners exist
DROP FUNCTION IF EXISTS attempt_match(UUID);

CREATE OR REPLACE FUNCTION attempt_match(current_user_id UUID)
RETURNS TABLE (call_id UUID, matched_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_entry matchmaking_queue%ROWTYPE;
  partner_entry RECORD;
  new_call_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'attempt_match requires authenticated user';
  END IF;

  PERFORM cleanup_duplicate_queue_entries();

  SELECT *
  INTO current_entry
  FROM matchmaking_queue
  WHERE user_id = current_user_id
    AND status = 'waiting'
  ORDER BY joined_queue_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  WITH current_profile AS (
    SELECT p.id,
           p.role,
           p.industry,
           p.study_field,
           p.university,
           p.location,
           ARRAY_REMOVE(ARRAY_AGG(ui.interest_id), NULL) AS interests
    FROM profiles p
    LEFT JOIN user_interests ui ON ui.user_id = p.id
    WHERE p.id = current_user_id
    GROUP BY p.id, p.role, p.industry, p.study_field, p.university, p.location
  ),
  candidates AS (
    SELECT mq.*,
           p.role,
           p.industry,
           p.study_field,
           p.university,
           p.location,
           ARRAY_REMOVE(ARRAY_AGG(ui.interest_id), NULL) AS interests
    FROM matchmaking_queue mq
    JOIN profiles p ON p.id = mq.user_id
    LEFT JOIN user_interests ui ON ui.user_id = mq.user_id
    WHERE mq.status = 'waiting'
      AND mq.user_id <> current_user_id
      AND (
        (current_entry.circle_id IS NULL AND mq.circle_id IS NULL) OR
        (current_entry.circle_id IS NOT NULL AND mq.circle_id = current_entry.circle_id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM call_history ch
        WHERE ch.status = 'ongoing'
          AND (ch.caller_id = mq.user_id OR ch.recipient_id = mq.user_id)
      )
      AND (current_entry.preferred_roles IS NULL
           OR array_length(current_entry.preferred_roles, 1) IS NULL
           OR p.role = ANY(current_entry.preferred_roles))
    GROUP BY mq.id, mq.joined_queue_at, mq.user_id, mq.circle_id, mq.preferred_roles,
             mq.preferred_topics, mq.filter_similar_interests, mq.filter_similar_background,
             mq.status, mq.joined_queue_at, mq.matched_at,
             p.role, p.industry, p.study_field, p.university, p.location
  ),
  scored AS (
    SELECT c.*,
      -- Similarity score: weight shared interests highest, then role/industry/education/location
      (
        COALESCE((
          SELECT COUNT(*) FROM UNNEST(c.interests) i
          WHERE i = ANY(cp.interests)
        ), 0) * 4) +
        CASE WHEN c.role = cp.role AND c.role IS NOT NULL THEN 3 ELSE 0 END +
        CASE WHEN c.industry = cp.industry AND c.industry IS NOT NULL THEN 2 ELSE 0 END +
        CASE WHEN c.study_field = cp.study_field AND c.study_field IS NOT NULL THEN 2 ELSE 0 END +
        CASE WHEN c.university = cp.university AND c.university IS NOT NULL THEN 2 ELSE 0 END +
        CASE WHEN cp.location IS NOT NULL AND c.location IS NOT NULL AND lower(c.location) = lower(cp.location) THEN 2 ELSE 0 END
        AS similarity_score
    FROM candidates c
    CROSS JOIN current_profile cp
  )
  SELECT * INTO partner_entry
  FROM scored
  ORDER BY similarity_score DESC NULLS LAST, joined_queue_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO call_history (caller_id, recipient_id, circle_id, started_at, status)
  VALUES (current_user_id, partner_entry.user_id, current_entry.circle_id, NOW(), 'ongoing')
  RETURNING id INTO new_call_id;

  UPDATE matchmaking_queue
  SET status = 'matched', matched_at = NOW()
  WHERE id IN (current_entry.id, partner_entry.id);

  UPDATE profiles
  SET in_call = TRUE
  WHERE id IN (current_user_id, partner_entry.user_id);

  RETURN QUERY
  SELECT new_call_id, partner_entry.user_id;
END;
$$;

COMMENT ON FUNCTION attempt_match(UUID) IS
'Atomically pairs the caller with the most similar waiting user (shared interests & profile fields), creates call_history, and updates queue/profile state.';
