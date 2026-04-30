-- ============================================================================
-- 078: Circle Abbreviation
--
-- Every circle gets a short, unique, human-friendly abbreviation that is used
-- in invite link generation and as the visible identifier in the future admin
-- manager. It is auto-assigned on circle creation and may be edited by circle
-- admins from the Circle Settings page.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Column
-- ---------------------------------------------------------------------------
ALTER TABLE circles
  ADD COLUMN IF NOT EXISTS abbreviation TEXT;

-- Format constraint: 2-10 chars, A-Z / 0-9 only (uppercase). Enforced at the
-- DB layer so neither client bugs nor manual SQL can poison the column.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'circles_abbreviation_format'
  ) THEN
    ALTER TABLE circles
      ADD CONSTRAINT circles_abbreviation_format
      CHECK (abbreviation IS NULL OR abbreviation ~ '^[A-Z0-9]{2,10}$');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Helper: generate an abbreviation candidate from a circle name
--    Strategy:
--      - Take the initials of each word, uppercase, A-Z0-9 only
--      - If only one word (or nothing usable), fall back to the first 3 chars
--      - If still empty, fall back to 'CRCL'
--      - Always trimmed to <= 6 chars before uniqueness handling
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_circle_abbreviation_candidate(circle_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned   TEXT;
  initials  TEXT;
BEGIN
  IF circle_name IS NULL THEN
    RETURN 'CRCL';
  END IF;

  -- Strip everything that isn't a letter, digit or whitespace
  cleaned := regexp_replace(circle_name, '[^A-Za-z0-9\s]', '', 'g');
  cleaned := upper(trim(cleaned));

  IF cleaned = '' THEN
    RETURN 'CRCL';
  END IF;

  -- Multi-word name -> initials of each word
  SELECT string_agg(left(word, 1), '')
  INTO   initials
  FROM   regexp_split_to_table(cleaned, '\s+') AS word
  WHERE  word <> '';

  IF initials IS NULL OR length(initials) < 2 THEN
    -- Single word or initials too short: use the first 4 chars of the name
    initials := regexp_replace(cleaned, '\s+', '', 'g');
    initials := left(initials, 4);
  END IF;

  IF length(initials) < 2 THEN
    initials := rpad(initials, 2, 'X');
  END IF;

  RETURN left(initials, 6);
END $$;

-- ---------------------------------------------------------------------------
-- 3. Helper: pick a unique abbreviation for a circle
--    Tries the candidate first, then candidate + 1, candidate + 2, ...
--    Excludes a given circle id so editing your own value doesn't collide.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_unique_circle_abbreviation(
  circle_name TEXT,
  exclude_id  UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base      TEXT;
  candidate TEXT;
  suffix    INT := 0;
BEGIN
  base      := generate_circle_abbreviation_candidate(circle_name);
  candidate := base;

  WHILE EXISTS (
    SELECT 1
    FROM   circles
    WHERE  abbreviation = candidate
      AND  (exclude_id IS NULL OR id <> exclude_id)
  ) LOOP
    suffix := suffix + 1;
    -- Ensure we stay within the 10-char limit
    candidate := left(base, 10 - length(suffix::text)) || suffix::text;
  END LOOP;

  RETURN candidate;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Backfill existing rows
-- ---------------------------------------------------------------------------
UPDATE circles
SET    abbreviation = generate_unique_circle_abbreviation(name, id)
WHERE  abbreviation IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Now lock the column down (NOT NULL + UNIQUE)
-- ---------------------------------------------------------------------------
ALTER TABLE circles
  ALTER COLUMN abbreviation SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'circles_abbreviation_unique'
  ) THEN
    ALTER TABLE circles
      ADD CONSTRAINT circles_abbreviation_unique UNIQUE (abbreviation);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_circles_abbreviation
  ON circles(abbreviation);

-- ---------------------------------------------------------------------------
-- 6. Auto-assign an abbreviation on insert when the client doesn't provide one
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION circles_set_default_abbreviation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.abbreviation IS NULL OR length(trim(NEW.abbreviation)) = 0 THEN
    NEW.abbreviation := generate_unique_circle_abbreviation(NEW.name, NEW.id);
  ELSE
    NEW.abbreviation := upper(NEW.abbreviation);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS circles_default_abbreviation ON circles;
CREATE TRIGGER circles_default_abbreviation
  BEFORE INSERT ON circles
  FOR EACH ROW
  EXECUTE FUNCTION circles_set_default_abbreviation();

-- Force-uppercase any UPDATE so admins can type 'mty' and we still store 'MTY'
CREATE OR REPLACE FUNCTION circles_normalise_abbreviation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.abbreviation IS NOT NULL THEN
    NEW.abbreviation := upper(trim(NEW.abbreviation));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS circles_uppercase_abbreviation ON circles;
CREATE TRIGGER circles_uppercase_abbreviation
  BEFORE UPDATE OF abbreviation ON circles
  FOR EACH ROW
  EXECUTE FUNCTION circles_normalise_abbreviation();

-- ---------------------------------------------------------------------------
-- 7. Documentation
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN circles.abbreviation IS
  'Short, unique, uppercase alphanumeric identifier (2-10 chars) auto-assigned at creation. Used in invite links and admin tooling. Editable by circle admins.';

NOTIFY pgrst, 'reload schema';
