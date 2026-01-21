-- Auto-delete chat messages older than 48 hours
-- This helps maintain privacy and reduce database storage

-- Enable pg_cron extension (available in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to delete old chat messages
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.chat_messages
  WHERE created_at < NOW() - INTERVAL '48 hours';
  
  -- Log the cleanup
  RAISE NOTICE 'Deleted old chat messages older than 48 hours';
END;
$$;

COMMENT ON FUNCTION delete_old_chat_messages() IS 'Deletes chat messages older than 48 hours for privacy and storage management';

-- Schedule the cleanup job to run every hour
-- This ensures messages are deleted within an hour of reaching 48 hours old
SELECT cron.schedule(
  'delete-old-chat-messages',           -- job name
  '0 * * * *',                           -- cron expression: every hour at minute 0
  $$SELECT delete_old_chat_messages();$$ -- SQL to execute
);

-- Grant execute permission to authenticated users (though it will run automatically)
GRANT EXECUTE ON FUNCTION delete_old_chat_messages() TO authenticated;

-- Note: If pg_cron is not available or you prefer to use Supabase Edge Functions,
-- you can create a Supabase Edge Function and use the Supabase dashboard to schedule it.



