-- ============================================================================
-- 095: Circle Visibility
--
-- Circles can be either 'public' (discoverable + joinable directly from the
-- homepage's Discover section) or 'private' (discoverable, but joinable only by
-- pasting a valid invite link). Pricing/paid circles are intentionally NOT
-- modelled yet — every circle is treated as free for now.
--
-- Existing circles (e.g. "Mentor the Young") default to 'private', which is the
-- correct classification for the only circle that exists today.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Column + format constraint
-- ---------------------------------------------------------------------------
ALTER TABLE circles
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'circles_visibility_check'
  ) THEN
    ALTER TABLE circles
      ADD CONSTRAINT circles_visibility_check
      CHECK (visibility IN ('public', 'private'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_circles_visibility
  ON circles(visibility);

-- ---------------------------------------------------------------------------
-- 2. Documentation
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN circles.visibility IS
  'Circle discoverability/join model: ''public'' (joinable directly from Discover) or ''private'' (joinable only via a valid invite link). Defaults to ''private''. Pricing is not modelled yet — all circles are free.';

-- Reload PostgREST schema cache so the new column is exposed immediately.
NOTIFY pgrst, 'reload schema';
