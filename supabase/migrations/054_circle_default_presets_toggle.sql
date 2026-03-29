-- ============================================================================
-- ADD CIRCLE SETTINGS FOR DEFAULT PRESETS VISIBILITY
-- Allows circle creators to hide/show default presets on their circle homepage
-- ============================================================================

-- Add column to circles table
ALTER TABLE circles ADD COLUMN IF NOT EXISTS show_default_presets BOOLEAN DEFAULT TRUE;
ALTER TABLE circles ADD COLUMN IF NOT EXISTS show_default_topics BOOLEAN DEFAULT TRUE;

-- Also ensure these columns exist (might have been added manually)
ALTER TABLE circles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE circles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::JSONB;

-- Comment for documentation
COMMENT ON COLUMN circles.show_default_presets IS 'When false, default presets are hidden from circle homepage';
COMMENT ON COLUMN circles.show_default_topics IS 'When false, default topics are hidden from circle topic selection';
