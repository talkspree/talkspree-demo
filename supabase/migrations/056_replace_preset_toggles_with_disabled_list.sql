-- ============================================================================
-- REPLACE BLANKET TOGGLES WITH GRANULAR DISABLED PRESETS LIST
-- Allows circle creators to disable specific default presets, not all of them
-- ============================================================================

-- Remove the blanket toggle columns
ALTER TABLE circles DROP COLUMN IF EXISTS show_default_presets;
ALTER TABLE circles DROP COLUMN IF EXISTS show_default_topics;

-- Add array of disabled default preset IDs
ALTER TABLE circles 
ADD COLUMN IF NOT EXISTS disabled_default_preset_ids UUID[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN circles.disabled_default_preset_ids IS 'Array of default preset IDs that are hidden from this circle';
