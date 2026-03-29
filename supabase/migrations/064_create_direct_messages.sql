-- Create direct_messages table for persistent DM conversations between connected contacts
-- Messages are preserved indefinitely until the contact relationship is removed

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  is_from_call BOOLEAN NOT NULL DEFAULT false,
  call_id UUID REFERENCES call_history(id) ON DELETE SET NULL,
  
  -- Prevent self-messaging
  CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(
  LEAST(sender_id, recipient_id), 
  GREATEST(sender_id, recipient_id), 
  created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dm_created_at ON direct_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages they sent or received
CREATE POLICY "Users can read their own messages"
  ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Policy: Users can send messages (insert as sender)
CREATE POLICY "Users can send messages"
  ON direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Recipients can update messages (mark as read)
CREATE POLICY "Recipients can mark messages as read"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Policy: Senders can edit their own messages
CREATE POLICY "Senders can edit their own messages"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can delete their own sent messages
CREATE POLICY "Users can delete their own messages"
  ON direct_messages FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Enable Realtime for live messaging
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- Function to get conversation between two users (paginated)
CREATE OR REPLACE FUNCTION get_conversation(
  p_other_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  recipient_id UUID,
  message TEXT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  is_from_call BOOLEAN,
  call_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT dm.id, dm.sender_id, dm.recipient_id, dm.message, 
         dm.created_at, dm.read_at, dm.is_from_call, dm.call_id
  FROM direct_messages dm
  WHERE (
    (dm.sender_id = auth.uid() AND dm.recipient_id = p_other_user_id) OR
    (dm.sender_id = p_other_user_id AND dm.recipient_id = auth.uid())
  )
  AND (p_before IS NULL OR dm.created_at < p_before)
  ORDER BY dm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_sender_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE direct_messages
  SET read_at = now()
  WHERE recipient_id = auth.uid()
    AND sender_id = p_sender_id
    AND read_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get unread message counts per contact
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

-- Function to send a direct message (validates contact relationship exists)
CREATE OR REPLACE FUNCTION send_direct_message(
  p_recipient_id UUID,
  p_message TEXT
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_is_contact BOOLEAN;
BEGIN
  -- Check that the recipient is a contact of the sender
  SELECT EXISTS(
    SELECT 1 FROM contacts
    WHERE user_id = auth.uid() AND contact_user_id = p_recipient_id
  ) INTO v_is_contact;
  
  IF NOT v_is_contact THEN
    RAISE EXCEPTION 'You can only message your contacts';
  END IF;
  
  -- Insert the message
  INSERT INTO direct_messages (sender_id, recipient_id, message)
  VALUES (auth.uid(), p_recipient_id, p_message)
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_dm_counts TO authenticated;
GRANT EXECUTE ON FUNCTION send_direct_message TO authenticated;

COMMENT ON TABLE direct_messages IS 'Persistent direct messages between connected contacts. Messages from calls are preserved here when users connect.';
COMMENT ON FUNCTION get_conversation IS 'Gets paginated conversation between current user and another user';
COMMENT ON FUNCTION mark_messages_read IS 'Marks all unread messages from a sender as read';
COMMENT ON FUNCTION get_unread_dm_counts IS 'Gets unread message counts grouped by sender';
COMMENT ON FUNCTION send_direct_message IS 'Sends a DM after validating contact relationship';
