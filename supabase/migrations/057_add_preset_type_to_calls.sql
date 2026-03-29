-- ============================================================================
-- ADD PRESET TYPE TO CALL_HISTORY
-- Stores whether the preset is 'default', 'circle', or 'user' type
-- ============================================================================

ALTER TABLE call_history 
ADD COLUMN IF NOT EXISTS caller_preset_type VARCHAR(20) DEFAULT 'default';

ALTER TABLE call_history 
ADD COLUMN IF NOT EXISTS recipient_preset_type VARCHAR(20) DEFAULT 'default';

COMMENT ON COLUMN call_history.caller_preset_type IS 'Type of preset: default, circle, or user';
COMMENT ON COLUMN call_history.recipient_preset_type IS 'Type of preset: default, circle, or user';
