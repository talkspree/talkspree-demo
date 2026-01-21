-- ============================================================================
-- UPDATE ATOMIC MATCHMAKING FUNCTION TO SUPPORT TOPIC CONFIGURATION
-- Adds topic_preset, custom_topics, and custom_questions parameters
-- ============================================================================

CREATE OR REPLACE FUNCTION attempt_match(
  current_user_id UUID,
  topic_preset VARCHAR DEFAULT NULL,
  custom_topics TEXT[] DEFAULT NULL,
  custom_questions TEXT[] DEFAULT NULL
)
RETURNS TABLE (call_id UUID, matched_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_entry matchmaking_queue%ROWTYPE;
  partner_entry matchmaking_queue%ROWTYPE;
  new_call_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'attempt_match requires authenticated user';
  END IF;

  -- Best-effort cleanup of duplicate waiting rows
  PERFORM cleanup_duplicate_queue_entries();

  -- Lock the caller's waiting entry
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

  -- Find the oldest compatible waiting partner and lock their row
  SELECT mq.*
  INTO partner_entry
  FROM matchmaking_queue mq
  JOIN profiles p ON p.id = mq.user_id
  WHERE mq.status = 'waiting'
    AND mq.user_id <> current_user_id
    AND (
      (current_entry.circle_id IS NULL AND mq.circle_id IS NULL) OR
      (current_entry.circle_id IS NOT NULL AND mq.circle_id = current_entry.circle_id)
    )
    AND COALESCE(p.in_call, FALSE) = FALSE
    AND NOT EXISTS (
      SELECT 1
      FROM call_history ch
      WHERE ch.status = 'ongoing'
        AND (ch.caller_id = mq.user_id OR ch.recipient_id = mq.user_id)
    )
    AND (
      current_entry.preferred_roles IS NULL
      OR array_length(current_entry.preferred_roles, 1) IS NULL
      OR p.role = ANY(current_entry.preferred_roles)
    )
  ORDER BY mq.joined_queue_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Create the call record with topic configuration
  INSERT INTO call_history (
    caller_id,
    recipient_id,
    circle_id,
    started_at,
    status,
    topic_preset,
    custom_topics,
    custom_questions
  )
  VALUES (
    current_user_id,
    partner_entry.user_id,
    current_entry.circle_id,
    NOW(),
    'ongoing',
    topic_preset,
    custom_topics,
    custom_questions
  )
  RETURNING id INTO new_call_id;

  -- Mark both queue entries as matched
  UPDATE matchmaking_queue
  SET status = 'matched', matched_at = NOW()
  WHERE id IN (current_entry.id, partner_entry.id);

  -- Flag both users as in a call
  UPDATE profiles
  SET in_call = TRUE
  WHERE id IN (current_user_id, partner_entry.user_id);

  RETURN QUERY
  SELECT new_call_id, partner_entry.user_id;
END;
$$;

COMMENT ON FUNCTION attempt_match(UUID, VARCHAR, TEXT[], TEXT[]) IS
'Atomically pairs the caller with a compatible waiting user, creates call_history with topic config, and updates queue/profile state.';
