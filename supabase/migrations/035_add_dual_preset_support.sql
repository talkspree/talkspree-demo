-- ============================================================================
-- ADD SUPPORT FOR BOTH USERS' TOPIC PRESETS
-- Stores both caller and recipient topic selections to merge questions
-- ============================================================================

-- Add columns for recipient's topic selection
ALTER TABLE call_history
ADD COLUMN recipient_topic_preset VARCHAR(50),
ADD COLUMN recipient_custom_topics TEXT[],
ADD COLUMN recipient_custom_questions TEXT[];

-- Rename existing columns to be explicit about caller
ALTER TABLE call_history
RENAME COLUMN topic_preset TO caller_topic_preset;

ALTER TABLE call_history
RENAME COLUMN custom_topics TO caller_custom_topics;

ALTER TABLE call_history
RENAME COLUMN custom_questions TO caller_custom_questions;

-- Add comments
COMMENT ON COLUMN call_history.caller_topic_preset IS 'Caller''s topic preset selection';
COMMENT ON COLUMN call_history.caller_custom_topics IS 'Caller''s custom topics if using custom preset';
COMMENT ON COLUMN call_history.caller_custom_questions IS 'Caller''s custom questions if using custom preset';
COMMENT ON COLUMN call_history.recipient_topic_preset IS 'Recipient''s topic preset selection';
COMMENT ON COLUMN call_history.recipient_custom_topics IS 'Recipient''s custom topics if using custom preset';
COMMENT ON COLUMN call_history.recipient_custom_questions IS 'Recipient''s custom questions if using custom preset';
