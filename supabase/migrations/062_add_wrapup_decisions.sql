-- Add wrap-up decision columns to call_history table
-- This tracks whether each user clicked "Connect" or "Skip" after a call

-- Add decision columns
ALTER TABLE call_history 
ADD COLUMN IF NOT EXISTS caller_wrapup_decision VARCHAR(10) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recipient_wrapup_decision VARCHAR(10) DEFAULT NULL;

-- Add check constraints for valid values
ALTER TABLE call_history
ADD CONSTRAINT caller_wrapup_decision_check 
CHECK (caller_wrapup_decision IS NULL OR caller_wrapup_decision IN ('connect', 'skip'));

ALTER TABLE call_history
ADD CONSTRAINT recipient_wrapup_decision_check 
CHECK (recipient_wrapup_decision IS NULL OR recipient_wrapup_decision IN ('connect', 'skip'));

-- Function to save wrap-up decision and handle mutual contact creation
-- Returns: 'pending' if waiting for other user, 'connected' if both connected, 'skipped' if either skipped
CREATE OR REPLACE FUNCTION save_wrapup_decision(
  p_call_id UUID,
  p_decision VARCHAR(10)
)
RETURNS JSON AS $$
DECLARE
  v_call RECORD;
  v_is_caller BOOLEAN;
  v_other_decision VARCHAR(10);
  v_result VARCHAR(20);
BEGIN
  -- Validate decision
  IF p_decision NOT IN ('connect', 'skip') THEN
    RAISE EXCEPTION 'Invalid decision. Must be "connect" or "skip"';
  END IF;

  -- Get the call and lock for update
  SELECT * INTO v_call 
  FROM call_history 
  WHERE id = p_call_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Call not found';
  END IF;

  -- Determine if current user is caller or recipient
  v_is_caller := (v_call.caller_id = auth.uid());
  
  IF NOT v_is_caller AND v_call.recipient_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not a participant in this call';
  END IF;

  -- Save the decision
  IF v_is_caller THEN
    UPDATE call_history 
    SET caller_wrapup_decision = p_decision
    WHERE id = p_call_id;
    
    v_other_decision := v_call.recipient_wrapup_decision;
  ELSE
    UPDATE call_history 
    SET recipient_wrapup_decision = p_decision
    WHERE id = p_call_id;
    
    v_other_decision := v_call.caller_wrapup_decision;
  END IF;

  -- Determine result and handle contact creation
  IF v_other_decision IS NULL THEN
    -- Other user hasn't decided yet
    v_result := 'pending';
  ELSIF p_decision = 'connect' AND v_other_decision = 'connect' THEN
    -- Both users clicked Connect - create mutual contacts!
    PERFORM add_mutual_contact(
      v_call.caller_id,
      v_call.recipient_id,
      v_call.circle_id,
      v_call.id
    );
    v_result := 'connected';
  ELSE
    -- At least one user skipped
    v_result := 'skipped';
  END IF;

  RETURN json_build_object(
    'status', v_result,
    'your_decision', p_decision,
    'other_decision', v_other_decision
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check the current wrap-up status for a call
CREATE OR REPLACE FUNCTION get_wrapup_status(p_call_id UUID)
RETURNS JSON AS $$
DECLARE
  v_call RECORD;
  v_is_caller BOOLEAN;
  v_your_decision VARCHAR(10);
  v_other_decision VARCHAR(10);
  v_result VARCHAR(20);
BEGIN
  SELECT * INTO v_call 
  FROM call_history 
  WHERE id = p_call_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Call not found';
  END IF;

  -- Determine if current user is caller or recipient
  v_is_caller := (v_call.caller_id = auth.uid());
  
  IF NOT v_is_caller AND v_call.recipient_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not a participant in this call';
  END IF;

  IF v_is_caller THEN
    v_your_decision := v_call.caller_wrapup_decision;
    v_other_decision := v_call.recipient_wrapup_decision;
  ELSE
    v_your_decision := v_call.recipient_wrapup_decision;
    v_other_decision := v_call.caller_wrapup_decision;
  END IF;

  -- Determine status
  IF v_your_decision IS NULL THEN
    v_result := 'awaiting_your_decision';
  ELSIF v_other_decision IS NULL THEN
    v_result := 'pending';
  ELSIF v_your_decision = 'connect' AND v_other_decision = 'connect' THEN
    v_result := 'connected';
  ELSE
    v_result := 'skipped';
  END IF;

  RETURN json_build_object(
    'status', v_result,
    'your_decision', v_your_decision,
    'other_decision', v_other_decision
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION save_wrapup_decision TO authenticated;
GRANT EXECUTE ON FUNCTION get_wrapup_status TO authenticated;

COMMENT ON FUNCTION save_wrapup_decision(UUID, VARCHAR) IS
'Saves the users wrap-up decision (connect/skip) and handles mutual contact creation when both users connect';

COMMENT ON FUNCTION get_wrapup_status(UUID) IS
'Gets the current wrap-up status for a call, showing both users decisions';
