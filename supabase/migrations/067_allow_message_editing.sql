-- Allow senders to edit their own messages
-- Currently only recipients can update (for marking as read)
-- We need a separate policy for senders to edit message content

-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON direct_messages;

-- Create separate policies for different update operations

-- Policy: Recipients can mark messages as read (update read_at only)
CREATE POLICY "Recipients can mark messages as read"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Policy: Senders can edit their own messages (update message content)
CREATE POLICY "Senders can edit their own messages"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

COMMENT ON POLICY "Senders can edit their own messages" ON direct_messages IS 
'Allows users to edit the content of messages they sent';
