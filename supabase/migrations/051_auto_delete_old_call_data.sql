-- Auto-delete old call history and call signals after 48 hours
-- This helps maintain privacy, reduce database storage, and comply with data retention policies
-- Note: Deleting call_history will also cascade delete related chat_messages and call_signals

-- Create function to delete old call history records
CREATE OR REPLACE FUNCTION delete_old_call_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_calls_count INTEGER;
  deleted_signals_count INTEGER;
BEGIN
  -- Delete call_signals older than 48 hours
  -- These are signaling data that are only needed during active calls
  DELETE FROM public.call_signals
  WHERE created_at < NOW() - INTERVAL '48 hours';
  
  GET DIAGNOSTICS deleted_signals_count = ROW_COUNT;
  
  -- Delete call_history records older than 48 hours
  -- This will CASCADE delete:
  --   - Related chat_messages (ON DELETE CASCADE)
  --   - Related call_signals (ON DELETE CASCADE) 
  DELETE FROM public.call_history
  WHERE started_at < NOW() - INTERVAL '48 hours';
  
  GET DIAGNOSTICS deleted_calls_count = ROW_COUNT;
  
  -- Log the cleanup results
  RAISE NOTICE 'Deleted % call history records and % call signals older than 48 hours', 
    deleted_calls_count, deleted_signals_count;
END;
$$;

COMMENT ON FUNCTION delete_old_call_data() IS 'Deletes call history and signals older than 48 hours for privacy and storage management. Cascades to chat_messages.';

-- Schedule the cleanup job to run every hour
-- This ensures data is deleted within an hour of reaching 48 hours old
SELECT cron.schedule(
  'delete-old-call-data',              -- job name
  '0 * * * *',                          -- cron expression: every hour at minute 0
  $$SELECT delete_old_call_data();$$   -- SQL to execute
);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_old_call_data() TO authenticated;

-- Optional: Run the cleanup immediately to test (comment out in production)
-- SELECT delete_old_call_data();



