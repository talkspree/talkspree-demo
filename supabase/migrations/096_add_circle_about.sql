-- ============================================================================
-- 096: Circle "About Us" info
--
-- Circle admins can curate the content shown in the Discover preview modal:
--   * about_description — a longer, rich-text (sanitized HTML) description that
--     replaces the previously hardcoded "What's inside?" copy.
--   * about_media       — an ordered list (max 5) of media items shown in the
--     preview gallery. Each item is { "type": "image" | "video", "url": "..." }.
--     Images are uploaded to the circle-assets bucket; videos are external links
--     (YouTube/Vimeo/etc.). The cover image and logo are NOT part of this list.
--   * anonymous_creator — when true, the preview hides who created the circle.
--
-- All three are public-facing (safe to expose in Discover); none are secrets.
-- ============================================================================

ALTER TABLE circles
  ADD COLUMN IF NOT EXISTS about_description TEXT,
  ADD COLUMN IF NOT EXISTS about_media JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS anonymous_creator BOOLEAN NOT NULL DEFAULT false;

-- Guard: about_media must always be a JSON array.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'circles_about_media_is_array'
  ) THEN
    ALTER TABLE circles
      ADD CONSTRAINT circles_about_media_is_array
      CHECK (jsonb_typeof(about_media) = 'array');
  END IF;
END $$;

COMMENT ON COLUMN circles.about_description IS
  'Longer rich-text (sanitized HTML) description shown in the Discover preview modal. Admin-editable.';
COMMENT ON COLUMN circles.about_media IS
  'Ordered JSON array (max 5, enforced in app) of preview media items: { type: ''image'' | ''video'', url }. Excludes the cover image and logo.';
COMMENT ON COLUMN circles.anonymous_creator IS
  'When true, the Discover preview hides the circle creator''s identity.';

-- Reload PostgREST schema cache so the new columns are exposed immediately.
NOTIFY pgrst, 'reload schema';
