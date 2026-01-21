-- ============================================================================
-- SESSION DURATION MANAGEMENT
-- Adds proper session duration tracking and matching
-- ============================================================================

-- Add session duration to matchmaking queue (what user wants)
ALTER TABLE matchmaking_queue
ADD COLUMN session_duration_minutes INTEGER DEFAULT 15
CHECK (session_duration_minutes IN (5, 10, 15, 30, 0)); -- 0 = unlimited

-- Add agreed duration to call_history (what both users agreed on = lower of the two)
ALTER TABLE call_history
ADD COLUMN agreed_duration_minutes INTEGER;

-- Add columns to track call extension requests
ALTER TABLE call_history
ADD COLUMN extend_requested_by UUID REFERENCES profiles(id),
ADD COLUMN extend_request_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN extend_approved_by UUID REFERENCES profiles(id),
ADD COLUMN extend_approved_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN extensions_count INTEGER DEFAULT 0;

COMMENT ON COLUMN call_history.agreed_duration_minutes IS 'The agreed call duration in minutes (lower of the two users preferences)';
COMMENT ON COLUMN call_history.extend_requested_by IS 'User who requested to extend the call';
COMMENT ON COLUMN call_history.extend_approved_by IS 'User who approved the extension request';
COMMENT ON COLUMN call_history.extensions_count IS 'Number of times the call has been extended';
