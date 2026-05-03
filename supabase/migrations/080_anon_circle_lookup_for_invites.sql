-- ============================================================================
-- 080: Anonymous circle lookup for affiliate invite links
--
-- `circles` SELECT is restricted to `authenticated` in 018_fix_circles_rls.sql,
-- so logged-out visitors clicking talkspree.com/<ABBR>/<slug> could not resolve
-- the circle and `AffiliateInvite` failed. This security-definer RPC returns
-- only id, name, abbreviation for a valid abbreviation — callable by `anon`.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_circle_by_abbreviation(p_abbrev TEXT)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  abbreviation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm TEXT := upper(trim(p_abbrev));
BEGIN
  IF norm IS NULL OR norm = '' OR norm !~ '^[A-Z0-9]{2,10}$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id,
         c.name,
         c.abbreviation
  FROM   circles c
  WHERE  c.abbreviation = norm
  LIMIT  1;
END $$;

REVOKE ALL ON FUNCTION get_circle_by_abbreviation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_circle_by_abbreviation(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION get_circle_by_abbreviation(TEXT) IS
  'Public lookup of a circle by abbreviation for invite landing pages. Returns minimal fields only; bypasses circles RLS for anon.';

NOTIFY pgrst, 'reload schema';
