-- ============================================================================
-- CLEANUP FUNCTION FOR DUPLICATE MATCHMAKING QUEUE ENTRIES
-- This function removes duplicate waiting entries for the same user
-- ============================================================================

-- Function to clean up duplicate queue entries
-- Keeps only the most recent entry per user
CREATE OR REPLACE FUNCTION cleanup_duplicate_queue_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Find users with multiple waiting entries
  WITH duplicates AS (
    SELECT 
      user_id,
      COUNT(*) as entry_count,
      ARRAY_AGG(id ORDER BY joined_queue_at DESC) as entry_ids
    FROM matchmaking_queue
    WHERE status = 'waiting'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ),
  entries_to_delete AS (
    SELECT 
      unnest(entry_ids[2:]) as id_to_delete
    FROM duplicates
  )
  DELETE FROM matchmaking_queue
  WHERE id IN (SELECT id_to_delete FROM entries_to_delete);
  
  GET DIAGNOSTICS duplicate_count = ROW_COUNT;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Cleaned up % duplicate queue entries', duplicate_count;
  END IF;
END;
$$;

-- Create a trigger to prevent duplicates (optional - can be added later if needed)
-- For now, we'll rely on application-level cleanup

COMMENT ON FUNCTION cleanup_duplicate_queue_entries() IS 
'Removes duplicate waiting queue entries, keeping only the most recent entry per user';













