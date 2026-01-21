-- ============================================================================
-- ADD CALL EXTENSION SIGNAL TYPES
-- Updates call_signals table to support extension request/approval flow
-- ============================================================================

-- Drop the old constraint
ALTER TABLE call_signals
DROP CONSTRAINT IF EXISTS call_signals_signal_type_check;

-- Add new constraint with extension signal types
ALTER TABLE call_signals
ADD CONSTRAINT call_signals_signal_type_check
CHECK (signal_type IN (
    'offer',
    'answer',
    'ice_candidate',
    'call_state',
    'agora_join',
    'agora_leave',
    'extension_request',
    'extension_approved',
    'extension_declined'
));

-- Add sender_id column if it doesn't exist (for tracking who sent the signal)
ALTER TABLE call_signals
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN call_signals.sender_id IS 'User who sent the signal (for extension requests/approvals)';
