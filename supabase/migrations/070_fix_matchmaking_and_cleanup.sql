-- ============================================================================
-- FIX MATCHMAKING: Restore circle, role, and in_call guards to attempt_match.
-- FIX CLEANUP: Make cleanup_stale_calls treat NULL heartbeats as fresh
-- (new calls haven't had time to send a heartbeat yet).
-- Schedule cleanup_stale_calls via pg_cron every 30 seconds.
-- ============================================================================

-- Drop all existing overloads
DROP FUNCTION IF EXISTS attempt_match(UUID, VARCHAR, TEXT[], TEXT[], INTEGER);
DROP FUNCTION IF EXISTS attempt_match(UUID, VARCHAR, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS attempt_match(UUID);

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
    v_current_circle_id UUID;
BEGIN
    -- Get caller's queue entry (circle_id) for circle-scoped matching
    SELECT mq.circle_id INTO v_current_circle_id
    FROM matchmaking_queue mq
    WHERE mq.user_id = current_user_id
      AND mq.status = 'waiting'
    ORDER BY mq.joined_queue_at DESC
    LIMIT 1;

    -- Find a waiting peer with all guards:
    --   1) Same circle bucket (both NULL or equal)
    --   2) Not already in a call
    --   3) Role preference filter (if caller set one)
    --   4) Prefer same session duration, then FIFO
    SELECT mq.user_id, mq.session_duration_minutes
    INTO v_peer_id, v_peer_duration
    FROM matchmaking_queue mq
    JOIN profiles p ON p.id = mq.user_id
    WHERE mq.user_id != current_user_id
      AND mq.status = 'waiting'
      -- Circle isolation
      AND (
        (v_current_circle_id IS NULL AND mq.circle_id IS NULL) OR
        (v_current_circle_id IS NOT NULL AND mq.circle_id = v_current_circle_id)
      )
      -- Not already in a call
      AND COALESCE(p.in_call, FALSE) = FALSE
      -- Not already in an ongoing call_history row
      AND NOT EXISTS (
        SELECT 1 FROM call_history ch
        WHERE ch.status = 'ongoing'
          AND (ch.caller_id = mq.user_id OR ch.recipient_id = mq.user_id)
      )
      -- Role preferences: if caller's queue entry has preferred_roles set,
      -- only match peers whose profile role is in that list.
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

    v_agreed_duration := LEAST(caller_session_duration, v_peer_duration);

    -- Mark both as matched
    UPDATE matchmaking_queue
    SET status = 'matched', matched_at = NOW()
    WHERE user_id IN (current_user_id, v_peer_id)
      AND status = 'waiting';

    -- Create call with agreed duration and circle_id
    INSERT INTO call_history (
        caller_id,
        recipient_id,
        circle_id,
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
        v_current_circle_id,
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

    call_id := v_call_id;
    matched_user_id := v_peer_id;
    RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION attempt_match(UUID, VARCHAR, TEXT[], TEXT[], INTEGER) IS
'Atomically matches two users in the queue with circle isolation, role filtering, '
'in_call guard, and session duration preference.';


-- ============================================================================
-- FIX cleanup_stale_calls: NULL heartbeats are NEW calls, not stale.
-- Only treat a heartbeat as stale if it was set and is older than threshold.
-- Also give new calls a 60-second grace period before checking heartbeats.
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_stale_calls()
RETURNS TABLE (call_id UUID, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stale_threshold INTERVAL := '45 seconds';
  grace_period INTERVAL := '60 seconds';
  call_record call_history%ROWTYPE;
BEGIN
  FOR call_record IN
    SELECT *
    FROM call_history
    WHERE status = 'ongoing'
      -- Only check calls older than the grace period
      AND started_at < (NOW() - grace_period)
      -- Stale = heartbeat was set but is too old, OR heartbeat was never set
      -- after the grace period (meaning the client never sent one)
      AND (
        (caller_last_heartbeat IS NOT NULL AND caller_last_heartbeat < (NOW() - stale_threshold))
        OR
        (recipient_last_heartbeat IS NOT NULL AND recipient_last_heartbeat < (NOW() - stale_threshold))
        OR
        (caller_last_heartbeat IS NULL AND started_at < (NOW() - grace_period))
        OR
        (recipient_last_heartbeat IS NULL AND started_at < (NOW() - grace_period))
      )
  LOOP
    UPDATE call_history
    SET status = 'completed',
        ended_at = NOW(),
        duration = EXTRACT(EPOCH FROM (NOW() - call_record.started_at))::INTEGER
    WHERE id = call_record.id
      AND status = 'ongoing';

    UPDATE profiles
    SET in_call = FALSE
    WHERE id IN (call_record.caller_id, call_record.recipient_id);

    RETURN QUERY SELECT call_record.id, 'Heartbeat timeout'::TEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION cleanup_stale_calls() IS
'Ends calls where a participant has not sent a heartbeat. '
'New calls get a 60-second grace period before heartbeat checking begins.';


-- ============================================================================
-- Schedule cleanup_stale_calls via pg_cron (every 30 seconds)
-- ============================================================================
DO $$
BEGIN
  -- Remove existing job if any
  PERFORM cron.unschedule('cleanup-stale-calls')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-calls'
  );
EXCEPTION WHEN OTHERS THEN
  -- cron extension might not be available, that's OK
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'cleanup-stale-calls',
    '30 seconds',
    'SELECT cleanup_stale_calls()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — cleanup_stale_calls will not be auto-scheduled. Run it manually or via edge function.';
END $$;
