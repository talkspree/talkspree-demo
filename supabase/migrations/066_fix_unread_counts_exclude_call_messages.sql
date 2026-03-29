-- Fix get_unread_dm_counts to exclude "from call" messages
-- Messages copied from calls shouldn't count as new unread messages

CREATE OR REPLACE FUNCTION get_unread_dm_counts()
RETURNS TABLE (
  sender_id UUID,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT dm.sender_id, COUNT(*)::BIGINT as unread_count
  FROM direct_messages dm
  WHERE dm.recipient_id = auth.uid()
    AND dm.read_at IS NULL
    AND dm.is_from_call = false
  GROUP BY dm.sender_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_unread_dm_counts IS 'Gets unread message counts per sender, excluding historical messages from calls';
