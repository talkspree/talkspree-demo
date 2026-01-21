-- ============================================================================
-- UPDATE ATTEMPT_MATCH TO HANDLE SESSION DURATION
-- Ensures both users get the lower of their preferred durations
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS attempt_match(UUID, VARCHAR, TEXT[], TEXT[], INTEGER);
DROP FUNCTION IF EXISTS attempt_match(UUID, VARCHAR, TEXT[], TEXT[]);

-- Recreate with duration parameter
CREATE OR REPLACE FUNCTION attempt_match(
    current_user_id UUID,
    caller_topic_preset VARCHAR DEFAULT NULL,
    caller_custom_topics TEXT[] DEFAULT NULL,
    caller_custom_questions TEXT[] DEFAULT NULL,
    caller_session_duration INTEGER DEFAULT 15
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
BEGIN
    -- Find a waiting peer (prefer same duration, but accept any if none found)
    SELECT mq.user_id, mq.session_duration_minutes INTO v_peer_id, v_peer_duration
    FROM matchmaking_queue mq
    WHERE mq.user_id != current_user_id
      AND mq.status = 'waiting'
    ORDER BY
        -- Prefer exact duration match
        (CASE WHEN mq.session_duration_minutes = caller_session_duration THEN 0 ELSE 1 END),
        -- Then by join time (FIFO)
        mq.joined_queue_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- No peer found
    IF v_peer_id IS NULL THEN
        RETURN;
    END IF;

    -- Calculate agreed duration (lower of the two)
    v_agreed_duration := LEAST(caller_session_duration, v_peer_duration);

    -- Mark both as matched
    UPDATE matchmaking_queue
    SET status = 'matched', matched_at = NOW()
    WHERE user_id IN (current_user_id, v_peer_id)
      AND status = 'waiting';

    -- Create call with agreed duration
    INSERT INTO call_history (
        caller_id,
        recipient_id,
        status,
        started_at,
        caller_topic_preset,
        caller_custom_topics,
        caller_custom_questions,
        agreed_duration_minutes
    )
    VALUES (
        current_user_id,
        v_peer_id,
        'ongoing',
        NOW(),
        caller_topic_preset,
        caller_custom_topics,
        caller_custom_questions,
        v_agreed_duration
    )
    RETURNING id INTO v_call_id;

    -- Update both users' profiles
    UPDATE profiles
    SET in_call = TRUE
    WHERE id IN (current_user_id, v_peer_id);

    -- Return result
    call_id := v_call_id;
    matched_user_id := v_peer_id;
    RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION attempt_match(UUID, VARCHAR, TEXT[], TEXT[], INTEGER) IS
'Atomically matches two users in the queue. Prefers users with same duration preference, otherwise uses lower duration for both.';
