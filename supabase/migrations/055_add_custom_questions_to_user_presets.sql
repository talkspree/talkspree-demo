-- ============================================================================
-- ADD CUSTOM_QUESTIONS COLUMN TO USER_PRESETS
-- Allows users to save editable custom questions directly on presets
-- (instead of creating a frozen user_topic)
-- ============================================================================

-- Add custom_questions column to user_presets if it doesn't exist
ALTER TABLE user_presets 
ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN user_presets.custom_questions IS 'User''s own questions saved directly on the preset (editable, not a frozen topic)';
