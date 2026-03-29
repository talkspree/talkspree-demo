-- ============================================================================
-- 076: Dynamic Roles + Similarity-Aware Matchmaking
--
-- 1. Drop hardcoded CHECK constraint on circle_members.role so admin-created
--    roles (Speaker, Volunteer, etc.) can be stored.
-- 2. Add similarity_preference column to matchmaking_queue.
-- 3. Rewrite attempt_match to:
--    a) Filter roles via circle_members.role when in a circle
--    b) Compute weighted similarity scores (interests, occupation, etc.)
--    c) Order candidates by proximity to the user's similarity preference
-- ============================================================================

-- ============================================================================
-- STEP 1: Relax circle_members.role constraint for custom roles
-- ============================================================================

ALTER TABLE circle_members
DROP CONSTRAINT IF EXISTS circle_members_role_check;

-- ============================================================================
-- STEP 2: Add similarity_preference to matchmaking_queue
-- ============================================================================

ALTER TABLE matchmaking_queue
ADD COLUMN IF NOT EXISTS similarity_preference INTEGER;

COMMENT ON COLUMN matchmaking_queue.similarity_preference IS
'0 = Different (target <=30%), 50 = Balanced (30-70%), 100 = Similar (>=70%). NULL = no preference (FIFO).';

-- ============================================================================
-- STEP 3: Rewrite attempt_match with circle-role filter + similarity scoring
-- ============================================================================

CREATE OR REPLACE FUNCTION attempt_match(
    current_user_id UUID,
    caller_topic_preset VARCHAR DEFAULT NULL,
    caller_custom_topics TEXT[] DEFAULT NULL,
    caller_custom_questions TEXT[] DEFAULT NULL,
    caller_session_duration INTEGER DEFAULT 15,
    skip_user_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (call_id UUID, matched_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_peer_id              UUID;
    v_peer_duration        INTEGER;
    v_agreed_duration      INTEGER;
    v_call_id              UUID;
    v_current_circle_id    UUID;
    v_preferred_roles      TEXT[];
    v_similarity_pref      INTEGER;
    v_target_score         INTEGER;
    v_my_role              TEXT;
    v_my_industry          TEXT;
    v_my_study             TEXT;
    v_my_uni               TEXT;
    v_my_location          TEXT;
    v_my_occupation        TEXT;
    v_my_interest_count    INTEGER;
    v_my_interest_ids      TEXT[];
BEGIN
    -- 1. Read caller's queue entry
    SELECT mq.circle_id, mq.preferred_roles, mq.similarity_preference
      INTO v_current_circle_id, v_preferred_roles, v_similarity_pref
      FROM matchmaking_queue mq
     WHERE mq.user_id = current_user_id
       AND mq.status  = 'waiting'
     ORDER BY mq.joined_queue_at DESC
     LIMIT 1;

    -- 2. If a similarity preference is set, pre-fetch caller's profile data
    IF v_similarity_pref IS NOT NULL THEN
        v_target_score := CASE
            WHEN v_similarity_pref = 0   THEN 15
            WHEN v_similarity_pref = 50  THEN 50
            WHEN v_similarity_pref = 100 THEN 85
            ELSE 50
        END;

        SELECT LOWER(TRIM(COALESCE(p.role, ''))),
               LOWER(TRIM(COALESCE(p.industry, ''))),
               LOWER(TRIM(COALESCE(p.study_field, ''))),
               LOWER(TRIM(COALESCE(p.university, ''))),
               LOWER(TRIM(COALESCE(p.location, ''))),
               LOWER(TRIM(COALESCE(p.occupation, '')))
          INTO v_my_role, v_my_industry, v_my_study,
               v_my_uni, v_my_location, v_my_occupation
          FROM profiles p
         WHERE p.id = current_user_id;

        SELECT COUNT(*)
          INTO v_my_interest_count
          FROM user_interests
         WHERE user_id = current_user_id;

        SELECT ARRAY(
            SELECT interest_id FROM user_interests WHERE user_id = current_user_id
        ) INTO v_my_interest_ids;
    END IF;

    -- 3. Find the best peer
    SELECT mq.user_id, mq.session_duration_minutes
      INTO v_peer_id, v_peer_duration
      FROM matchmaking_queue mq
      JOIN profiles p ON p.id = mq.user_id
      LEFT JOIN circle_members cm
        ON v_current_circle_id IS NOT NULL
       AND cm.user_id   = mq.user_id
       AND cm.circle_id = v_current_circle_id
       AND cm.status     = 'active'
     WHERE mq.user_id != current_user_id
       AND mq.status = 'waiting'
       -- Skip previously-chatted session users
       AND (skip_user_ids IS NULL OR NOT (mq.user_id = ANY(skip_user_ids)))
       -- Circle isolation
       AND (
           (v_current_circle_id IS NULL     AND mq.circle_id IS NULL) OR
           (v_current_circle_id IS NOT NULL AND mq.circle_id = v_current_circle_id)
       )
       AND COALESCE(p.in_call, FALSE) = FALSE
       AND NOT EXISTS (
           SELECT 1 FROM call_history ch
            WHERE ch.status = 'ongoing'
              AND (ch.caller_id = mq.user_id OR ch.recipient_id = mq.user_id)
       )
       -- Role filter: circle_members.role when in a circle, profiles.role otherwise
       AND (
           v_preferred_roles IS NULL
           OR array_length(v_preferred_roles, 1) = 0
           OR (v_current_circle_id IS NOT NULL AND cm.role = ANY(v_preferred_roles))
           OR (v_current_circle_id IS NULL     AND p.role  = ANY(v_preferred_roles))
       )
     ORDER BY
       -- Primary: similarity distance (only when a preference is set)
       CASE WHEN v_similarity_pref IS NOT NULL THEN
           ABS(
               ROUND(
                   -- Interest overlap (weight 40)
                   COALESCE((
                       SELECT COUNT(*)::FLOAT
                         / GREATEST(
                               v_my_interest_count::FLOAT,
                               (SELECT COUNT(*) FROM user_interests WHERE user_id = mq.user_id)::FLOAT,
                               1.0
                           ) * 40.0
                         FROM user_interests ui_c
                        WHERE ui_c.user_id     = mq.user_id
                          AND ui_c.interest_id = ANY(v_my_interest_ids)
                   ), 0)
                   -- Role match (weight 15)
                   + CASE WHEN v_my_role != '' AND v_my_role = LOWER(TRIM(COALESCE(p.role, '')))
                          THEN 15 ELSE 0 END
                   -- Industry match (weight 10)
                   + CASE WHEN v_my_industry != '' AND v_my_industry = LOWER(TRIM(COALESCE(p.industry, '')))
                          THEN 10 ELSE 0 END
                   -- Study field match (weight 10)
                   + CASE WHEN v_my_study != '' AND v_my_study = LOWER(TRIM(COALESCE(p.study_field, '')))
                          THEN 10 ELSE 0 END
                   -- University match (weight 5)
                   + CASE WHEN v_my_uni != '' AND v_my_uni = LOWER(TRIM(COALESCE(p.university, '')))
                          THEN 5 ELSE 0 END
                   -- Location match (weight 10)
                   + CASE WHEN v_my_location != '' AND v_my_location = LOWER(TRIM(COALESCE(p.location, '')))
                          THEN 10 ELSE 0 END
                   -- Occupation match (weight 10)
                   + CASE WHEN v_my_occupation != '' AND v_my_occupation = LOWER(TRIM(COALESCE(p.occupation, '')))
                          THEN 10 ELSE 0 END
               )::INTEGER
               - v_target_score
           )
       ELSE 0
       END ASC,
       -- Secondary: prefer matching session duration
       CASE WHEN mq.session_duration_minutes = caller_session_duration THEN 0 ELSE 1 END ASC,
       -- Tertiary: FIFO
       mq.joined_queue_at ASC
     LIMIT 1
       FOR UPDATE OF mq SKIP LOCKED;

    IF v_peer_id IS NULL THEN
        RETURN;
    END IF;

    -- 4. Compute agreed duration
    IF caller_session_duration = 0 AND v_peer_duration = 0 THEN
        v_agreed_duration := 0;
    ELSIF caller_session_duration = 0 THEN
        v_agreed_duration := v_peer_duration;
    ELSIF v_peer_duration = 0 THEN
        v_agreed_duration := caller_session_duration;
    ELSE
        v_agreed_duration := LEAST(caller_session_duration, v_peer_duration);
    END IF;

    -- 5. Mark both as matched
    UPDATE matchmaking_queue
       SET status = 'matched', matched_at = NOW()
     WHERE user_id IN (current_user_id, v_peer_id)
       AND status = 'waiting';

    -- 6. Create call record
    INSERT INTO call_history (
        caller_id, recipient_id, circle_id, status, started_at,
        caller_topic_preset, caller_custom_topics, caller_custom_questions,
        agreed_duration_minutes
    )
    VALUES (
        current_user_id, v_peer_id, v_current_circle_id, 'ongoing', NOW(),
        caller_topic_preset, caller_custom_topics, caller_custom_questions,
        v_agreed_duration
    )
    RETURNING id INTO v_call_id;

    -- 7. Mark both as in_call
    UPDATE profiles
       SET in_call = TRUE
     WHERE id IN (current_user_id, v_peer_id);

    call_id        := v_call_id;
    matched_user_id := v_peer_id;
    RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION attempt_match(UUID, VARCHAR, TEXT[], TEXT[], INTEGER, UUID[]) IS
'Atomically matches two users with similarity-aware ordering. '
'similarity_preference in queue: 0=Different, 50=Balanced, 100=Similar. '
'Role filtering uses circle_members.role when in a circle. '
'Duration 0 = infinite.';

-- ============================================================================
-- STEP 4: Update get_global_activity_stats to use circle_members.role
-- when a circle is specified, matching the attempt_match behaviour.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_global_activity_stats(
  p_user_id UUID,
  p_circle_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  looking_for_chat_count INTEGER,
  currently_chatting_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_looking_count INTEGER;
  v_chatting_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT mq.user_id)
  INTO v_looking_count
  FROM matchmaking_queue mq
  INNER JOIN profiles p ON p.id = mq.user_id
  LEFT JOIN circle_members cm
    ON p_circle_id IS NOT NULL
   AND cm.user_id   = mq.user_id
   AND cm.circle_id = p_circle_id
   AND cm.status     = 'active'
  WHERE mq.status = 'waiting'
    AND mq.user_id != p_user_id
    AND (
      (p_circle_id IS NULL AND mq.circle_id IS NULL) OR
      (p_circle_id IS NOT NULL AND mq.circle_id = p_circle_id)
    )
    AND (
      p_role IS NULL
      OR p_role = 'random'
      OR (p_circle_id IS NOT NULL AND cm.role = p_role)
      OR (p_circle_id IS NULL     AND p.role  = p_role)
    );

  SELECT COUNT(DISTINCT user_id)
  INTO v_chatting_count
  FROM (
    SELECT ch.caller_id AS user_id
    FROM call_history ch
    LEFT JOIN circle_members cm
      ON p_circle_id IS NOT NULL
     AND cm.user_id   = ch.caller_id
     AND cm.circle_id = p_circle_id
     AND cm.status     = 'active'
    INNER JOIN profiles p ON p.id = ch.caller_id
    WHERE ch.status = 'ongoing'
      AND ch.caller_id != p_user_id
      AND (
        (p_circle_id IS NULL AND ch.circle_id IS NULL) OR
        (p_circle_id IS NOT NULL AND ch.circle_id = p_circle_id)
      )
      AND (
        p_role IS NULL
        OR p_role = 'random'
        OR (p_circle_id IS NOT NULL AND cm.role = p_role)
        OR (p_circle_id IS NULL     AND p.role  = p_role)
      )

    UNION

    SELECT ch.recipient_id AS user_id
    FROM call_history ch
    LEFT JOIN circle_members cm
      ON p_circle_id IS NOT NULL
     AND cm.user_id   = ch.recipient_id
     AND cm.circle_id = p_circle_id
     AND cm.status     = 'active'
    INNER JOIN profiles p ON p.id = ch.recipient_id
    WHERE ch.status = 'ongoing'
      AND ch.recipient_id != p_user_id
      AND (
        (p_circle_id IS NULL AND ch.circle_id IS NULL) OR
        (p_circle_id IS NOT NULL AND ch.circle_id = p_circle_id)
      )
      AND (
        p_role IS NULL
        OR p_role = 'random'
        OR (p_circle_id IS NOT NULL AND cm.role = p_role)
        OR (p_circle_id IS NULL     AND p.role  = p_role)
      )
  ) AS all_chatting_users;

  looking_for_chat_count := COALESCE(v_looking_count, 0);
  currently_chatting_count := COALESCE(v_chatting_count, 0);

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION get_global_activity_stats(UUID, UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
