-- ============================================================================
-- 079: Affiliate Invite System
--
-- Every user gets a short, unique, random alphanumeric `slug` used in personal
-- circle invite links of the form `talkspree.com/<circleAbbreviation>/<userSlug>`.
-- New profiles created via such a link record:
--   * `invited_by`             -> the inviter's profiles.id (lifetime affiliate)
--   * `invited_via_circle_id`  -> the circle whose invite link was clicked
--
-- The slug is auto-assigned at profile creation by both the existing
-- `handle_new_user` trigger and a new `BEFORE INSERT` trigger so it can never
-- be missing — even if the inserter forgets to set it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columns (all nullable so this migration runs on a populated DB)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_via_circle_id UUID REFERENCES circles(id) ON DELETE SET NULL;

-- Format constraint: exactly 6 chars, lowercase a-z / 0-9 only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'profiles_slug_format'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_slug_format
      CHECK (slug IS NULL OR slug ~ '^[a-z0-9]{6}$');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Helper: generate a unique 6-char base36 slug
--    Strategy:
--      - Pick a random 6-char string from [a-z0-9]
--      - Loop until no collision in profiles.slug
--      - Hard cap of 50 attempts so a runaway never spins forever
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_user_slug()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet  TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  candidate TEXT;
  attempts  INT  := 0;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      -- floor(random()*36) yields 0..35
      candidate := candidate || substr(alphabet, 1 + floor(random() * 36)::int, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM profiles WHERE slug = candidate
    );

    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'generate_user_slug: could not find a unique slug after 50 attempts';
    END IF;
  END LOOP;

  RETURN candidate;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Backfill every existing profile so no row is left without a slug.
--    Done BEFORE adding NOT NULL/UNIQUE so this works on a populated DB.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE slug IS NULL LOOP
    UPDATE profiles
    SET    slug = generate_user_slug()
    WHERE  id = r.id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Lock the column down (NOT NULL + UNIQUE + index)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'profiles_slug_unique'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_slug_unique UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON profiles(invited_by);
CREATE INDEX IF NOT EXISTS idx_profiles_invited_via_circle_id ON profiles(invited_via_circle_id);

-- ---------------------------------------------------------------------------
-- 5. Auto-assign a slug on insert when not provided
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION profiles_set_default_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    NEW.slug := generate_user_slug();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_default_slug ON profiles;
CREATE TRIGGER profiles_default_slug
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_set_default_slug();

-- ---------------------------------------------------------------------------
-- 6. Update `handle_new_user` to:
--      - keep its current behaviour (email, first/last name, flags)
--      - read `invited_by` and `invited_via_circle_id` from raw_user_meta_data
--        and persist them ONLY when they reference real rows
--    Slug is filled in by `profiles_default_slug` trigger above, so no
--    explicit slug column here.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_invited_by_text   TEXT;
  meta_invited_circle_text TEXT;
  resolved_invited_by    UUID;
  resolved_invited_circle UUID;
BEGIN
  -- Read affiliate metadata defensively (cast errors must not break signup)
  meta_invited_by_text     := NEW.raw_user_meta_data->>'invited_by';
  meta_invited_circle_text := NEW.raw_user_meta_data->>'invited_via_circle_id';

  BEGIN
    IF meta_invited_by_text IS NOT NULL AND meta_invited_by_text <> '' THEN
      resolved_invited_by := meta_invited_by_text::UUID;
      -- Reject self-invite and missing inviter
      IF resolved_invited_by = NEW.id
         OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = resolved_invited_by) THEN
        resolved_invited_by := NULL;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    resolved_invited_by := NULL;
  END;

  BEGIN
    IF meta_invited_circle_text IS NOT NULL AND meta_invited_circle_text <> '' THEN
      resolved_invited_circle := meta_invited_circle_text::UUID;
      IF NOT EXISTS (SELECT 1 FROM circles WHERE id = resolved_invited_circle) THEN
        resolved_invited_circle := NULL;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    resolved_invited_circle := NULL;
  END;

  INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    email_verified,
    onboarding_completed,
    invited_by,
    invited_via_circle_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    false,
    false,
    resolved_invited_by,
    resolved_invited_circle
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    -- Only set affiliate fields if not already populated (first writer wins)
    invited_by = COALESCE(profiles.invited_by, EXCLUDED.invited_by),
    invited_via_circle_id = COALESCE(profiles.invited_via_circle_id, EXCLUDED.invited_via_circle_id);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. Public lookup RPC: minimal inviter info by slug
--    SECURITY DEFINER + locked-down return shape so we never widen
--    `profiles` RLS just to render the "Invited by" banner pre-login.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_inviter_by_slug(p_slug TEXT)
RETURNS TABLE (
  id                  UUID,
  first_name          TEXT,
  last_name           TEXT,
  profile_picture_url TEXT,
  slug                TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id,
         p.first_name,
         p.last_name,
         p.profile_picture_url,
         p.slug
  FROM   profiles p
  WHERE  p.slug = lower(p_slug)
  LIMIT  1;
END $$;

REVOKE ALL ON FUNCTION get_inviter_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_inviter_by_slug(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Authenticated "claim" RPC for the OAuth path (no raw_user_meta_data hook)
--    - Writes invited_by/invited_via_circle_id on the CALLER'S profile only
--    - First-writer-wins: refuses to overwrite an existing inviter
--    - Refuses self-invite
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_affiliate(
  p_inviter_id UUID,
  p_circle_id  UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  rows_updated INT;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'claim_affiliate: not authenticated';
  END IF;

  IF p_inviter_id IS NULL OR p_inviter_id = caller_id THEN
    RETURN FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_inviter_id) THEN
    RETURN FALSE;
  END IF;

  IF p_circle_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM circles WHERE id = p_circle_id) THEN
    p_circle_id := NULL;
  END IF;

  UPDATE profiles
  SET    invited_by = p_inviter_id,
         invited_via_circle_id = COALESCE(invited_via_circle_id, p_circle_id)
  WHERE  id = caller_id
    AND  invited_by IS NULL;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END $$;

REVOKE ALL ON FUNCTION claim_affiliate(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_affiliate(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. Documentation
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN profiles.slug IS
  'Short, unique 6-char [a-z0-9] identifier. Used in personal circle invite links: talkspree.com/<circleAbbreviation>/<slug>. Auto-assigned at profile creation.';
COMMENT ON COLUMN profiles.invited_by IS
  'Profile id of the user whose affiliate invite link brought this user to the platform. Set once at signup; never overwritten.';
COMMENT ON COLUMN profiles.invited_via_circle_id IS
  'Circle whose invite link was used at signup. Analytics only — affiliate revenue share follows invited_by, not this column.';

NOTIFY pgrst, 'reload schema';
