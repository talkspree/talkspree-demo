-- Create chat_messages table for real-time chat during calls
-- Uses Supabase Realtime instead of Agora RTM

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id uuid NOT NULL REFERENCES call_history(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_call_id ON public.chat_messages(call_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users who are part of a call can read messages from that call
CREATE POLICY "Users in call can read messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM call_history c 
      WHERE c.id = chat_messages.call_id 
      AND (c.caller_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

-- Policy: Users who are part of a call can insert messages
CREATE POLICY "Users in call can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM call_history c 
      WHERE c.id = chat_messages.call_id 
      AND (c.caller_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

-- Enable realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

COMMENT ON TABLE public.chat_messages IS 'Real-time chat messages during video calls';

