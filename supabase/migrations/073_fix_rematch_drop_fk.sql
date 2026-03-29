-- Drop the FK constraint on rematch_willing_with if it exists.
-- The FK created a second relationship from matchmaking_queue -> profiles
-- which made PostgREST's implicit join ambiguous (PGRST201).

DO $$
DECLARE
  _con TEXT;
BEGIN
  SELECT conname INTO _con
  FROM pg_constraint
  WHERE conrelid = 'matchmaking_queue'::regclass
    AND contype = 'f'
    AND EXISTS (
      SELECT 1
      FROM pg_attribute a
      WHERE a.attrelid = conrelid
        AND a.attnum = ANY(conkey)
        AND a.attname = 'rematch_willing_with'
    );

  IF _con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE matchmaking_queue DROP CONSTRAINT %I', _con);
    RAISE NOTICE 'Dropped FK constraint % on rematch_willing_with', _con;
  ELSE
    RAISE NOTICE 'No FK constraint found on rematch_willing_with (column may not exist yet or FK was never created)';
  END IF;
END $$;

-- Ensure the column exists (idempotent)
ALTER TABLE matchmaking_queue
ADD COLUMN IF NOT EXISTS rematch_willing_with UUID DEFAULT NULL;
