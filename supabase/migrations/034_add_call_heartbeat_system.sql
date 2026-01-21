-- ============================================================================
-- CALL HEARTBEAT SYSTEM
-- Adds last_heartbeat tracking to detect disconnected users
-- ============================================================================

-- Add heartbeat columns to call_history
ALTER TABLE call_history
ADD COLUMN caller_last_heartbeat TIMESTAMP WITH TIME ZONE,
ADD COLUMN recipient_last_heartbeat TIMESTAMP WITH TIME ZONE;

-- Add index for faster heartbeat queries
CREATE INDEX idx_call_history_heartbeats ON call_history(status, caller_last_heartbeat, recipient_last_heartbeat);

-- Function to update heartbeat for current user in a call
CREATE OR REPLACE FUNCTION update_call_heartbeat(p_call_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  call_record call_history%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'update_call_heartbeat requires authenticated user';
  END IF;

  -- Get the call record
  SELECT * INTO call_record
  FROM call_history
  WHERE id = p_call_id
    AND status = 'ongoing'
    AND (caller_id = current_user_id OR recipient_id = current_user_id);

  IF NOT FOUND THEN
    RETURN; -- Call doesn't exist or user is not a participant
  END IF;

  -- Update the appropriate heartbeat column
  IF call_record.caller_id = current_user_id THEN
    UPDATE call_history
    SET caller_last_heartbeat = NOW()
    WHERE id = p_call_id;
  ELSE
    UPDATE call_history
    SET recipient_last_heartbeat = NOW()
    WHERE id = p_call_id;
  END IF;
END;
$$;

-- Function to detect stale calls (no heartbeat in 30 seconds)
CREATE OR REPLACE FUNCTION cleanup_stale_calls()
RETURNS TABLE (call_id UUID, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stale_threshold INTERVAL := '30 seconds';
  call_record call_history%ROWTYPE;
BEGIN
  FOR call_record IN
    SELECT *
    FROM call_history
    WHERE status = 'ongoing'
      AND (
        caller_last_heartbeat < (NOW() - stale_threshold) OR
        recipient_last_heartbeat < (NOW() - stale_threshold) OR
        caller_last_heartbeat IS NULL OR
        recipient_last_heartbeat IS NULL
      )
  LOOP
    -- End the call
    UPDATE call_history
    SET status = 'completed',
        ended_at = NOW(),
        duration = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    WHERE id = call_record.id;

    -- Update both users' profiles
    UPDATE profiles
    SET in_call = FALSE
    WHERE id IN (call_record.caller_id, call_record.recipient_id);

    -- Return info about ended call
    RETURN QUERY SELECT call_record.id, 'Heartbeat timeout'::TEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION update_call_heartbeat(UUID) IS
'Updates the heartbeat timestamp for the current user in an ongoing call';

COMMENT ON FUNCTION cleanup_stale_calls() IS
'Ends calls where either participant has not sent a heartbeat in 30 seconds';
