-- ============================================================================
-- ENABLE REALTIME FOR CALL SIGNALS
-- Fixes Supabase Realtime not receiving broadcasts
-- ============================================================================

-- Enable replica identity for realtime subscriptions
-- This is REQUIRED for Supabase Realtime to work
ALTER TABLE call_signals REPLICA IDENTITY FULL;

-- Enable realtime on the call_signals table
-- This allows postgres_changes subscriptions to receive INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;

COMMENT ON TABLE call_signals IS 'Stores call signaling data for WebRTC and Agora connections. Realtime enabled for live updates.';
