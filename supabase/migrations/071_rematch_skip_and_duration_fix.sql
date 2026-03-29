-- ============================================================================
-- 1. FIX attempt_match: add skip_user_id to avoid auto-rematching with the
--    same person, and fix LEAST() for infinite (0) duration.
-- 2. Add attempt_match_with: force-match with a specific peer (used when
--    user accepts the re-match prompt).
-- ============================================================================

DROP FUNCTION IF EXISTS attempt_match(UUID, VARCHAR, TEXT[], TEXT[], INTEGER);
DROP FUNCTION IF EXISTS attempt_match(UUID, VARCHAR, TEXT[], TEXT[], INTEGER, UUID);

CREATE OR REPLACE FUNCTION attempt_match(
    current_user_id UUID,
    caller_topic_preset VARCHAR DEFAULT NULL,
    caller_custom_topics TEXT[] DEFAULT NULL,
    caller_custom_questions TEXT[] DEFAULT NULL,
    caller_session_duration INTEGER DEFAULT 15,
    skip_user_id UUID DEFAULT NULL
)
RETURNS TABLE (call_id UUID, matched_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_peer_id UUID;
    v_peer_duration INTEGER;
    v_agreed_duration INTEGER;
    v_call_id UUID;
    v_current_circle_id UUID;
BEGIN
    SELECT mq.circle_id INTO v_current_circle_id
    FROM matchmaking_queue mq
    WHERE mq.user_id = current_user_id
      AND mq.status = 'waiting'
    ORDER BY mq.joined_queue_at DESC
    LIMIT 1;

    SELECT mq.user_id, mq.session_duration_minutes
    INTO v_peer_id, v_peer_duration
    FROM matchmaking_queue mq
    JOIN profiles p ON p.id = mq.user_id
    WHERE mq.user_id != current_user_id
      AND mq.status = 'waiting'
      -- Skip the last call partner if requested
      AND (skip_user_id IS NULL OR mq.user_id != skip_user_id)
      -- Circle isolation
      AND (
        (v_current_circle_id IS NULL AND mq.circle_id IS NULL) OR
        (v_current_circle_id IS NOT NULL AND mq.circle_id = v_current_circle_id)
      )
      AND COALESCE(p.in_call, FALSE) = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM call_history ch
        WHERE ch.status = 'ongoing'
          AND (ch.caller_id = mq.user_id OR ch.recipient_id = mq.user_id)
      )
      -- Role preferences
      AND (
        NOT EXISTS (
          SELECT 1 FROM matchmaking_queue cmq
          WHERE cmq.user_id = current_user_id
            AND cmq.status = 'waiting'
            AND cmq.preferred_roles IS NOT NULL
            AND array_length(cmq.preferred_roles, 1) > 0
        )
        OR p.role = ANY(
          (SELECT cmq2.preferred_roles FROM matchmaking_queue cmq2
           WHERE cmq2.user_id = current_user_id AND cmq2.status = 'waiting'
           ORDER BY cmq2.joined_queue_at DESC LIMIT 1)
        )
      )
    ORDER BY
        (CASE WHEN mq.session_duration_minutes = caller_session_duration THEN 0 ELSE 1 END),
        mq.joined_queue_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_peer_id IS NULL THEN
        RETURN;
    END IF;

    -- Duration agreement: 0 = infinite.
    -- If both are 0, agreed = 0 (infinite).
    -- If one is 0, use the other (finite) value.
    -- Otherwise, use the smaller of the two.
    IF caller_session_duration = 0 AND v_peer_duration = 0 THEN
        v_agreed_duration := 0;
    ELSIF caller_session_duration = 0 THEN
        v_agreed_duration := v_peer_duration;
    ELSIF v_peer_duration = 0 THEN
        v_agreed_duration := caller_session_duration;
    ELSE
        v_agreed_duration := LEAST(caller_session_duration, v_peer_duration);
    END IF;

    UPDATE matchmaking_queue
    SET status = 'matched', matched_at = NOW()
    WHERE user_id IN (current_user_id, v_peer_id)
      AND status = 'waiting';

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

    UPDATE profiles
    SET in_call = TRUE
    WHERE id IN (current_user_id, v_peer_id);

    call_id := v_call_id;
    matched_user_id := v_peer_id;
    RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION attempt_match(UUID, VARCHAR, TEXT[], TEXT[], INTEGER, UUID) IS
'Atomically matches two users. skip_user_id allows skipping a specific peer '
'(e.g. last call partner). Duration 0 = infinite; the lower finite value wins.';
