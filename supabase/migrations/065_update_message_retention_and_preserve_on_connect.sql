-- Update message retention: 5 days for non-connected users (was 48 hours)
-- Preserve call messages for connected users by copying to direct_messages on connect
-- Delete DMs when contact relationship is removed

-- ============================================================================
-- 1. UPDATE AUTO-DELETE: Change from 48 hours to 5 days for chat_messages
-- ============================================================================

-- Update the chat messages cleanup function
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.chat_messages
  WHERE created_at < NOW() - INTERVAL '5 days';
  
  RAISE NOTICE 'Deleted old chat messages older than 5 days';
END;
$$;

COMMENT ON FUNCTION delete_old_chat_messages() IS 'Deletes chat messages older than 5 days for privacy and storage management';

-- Update the call data cleanup function to also use 5 days
CREATE OR REPLACE FUNCTION delete_old_call_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_calls_count INTEGER;
  deleted_signals_count INTEGER;
BEGIN
  -- Delete call_signals older than 5 days
  DELETE FROM public.call_signals
  WHERE created_at < NOW() - INTERVAL '5 days';
  
  GET DIAGNOSTICS deleted_signals_count = ROW_COUNT;
  
  -- Delete call_history records older than 5 days
  -- This will CASCADE delete related chat_messages
  DELETE FROM public.call_history
  WHERE started_at < NOW() - INTERVAL '5 days';
  
  GET DIAGNOSTICS deleted_calls_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % call history records and % call signals older than 5 days', 
    deleted_calls_count, deleted_signals_count;
END;
$$;

COMMENT ON FUNCTION delete_old_call_data() IS 'Deletes call history and signals older than 5 days for privacy and storage management. Cascades to chat_messages.';

-- ============================================================================
-- 2. COPY CALL MESSAGES ON CONNECT: Update add_mutual_contact to preserve chat
-- ============================================================================

-- Update add_mutual_contact to also copy chat messages to direct_messages
CREATE OR REPLACE FUNCTION add_mutual_contact(
  p_user_id UUID,
  p_contact_user_id UUID,
  p_circle_id UUID DEFAULT NULL,
  p_call_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_call RECORD;
BEGIN
  -- Add contact for first user
  INSERT INTO contacts (user_id, contact_user_id, circle_id, call_id)
  VALUES (p_user_id, p_contact_user_id, p_circle_id, p_call_id)
  ON CONFLICT (user_id, contact_user_id, circle_id) DO NOTHING;
  
  -- Add contact for second user
  INSERT INTO contacts (user_id, contact_user_id, circle_id, call_id)
  VALUES (p_contact_user_id, p_user_id, p_circle_id, p_call_id)
  ON CONFLICT (user_id, contact_user_id, circle_id) DO NOTHING;
  
  -- If there's a call_id, copy the chat messages to direct_messages
  IF p_call_id IS NOT NULL THEN
    -- Get the call details to determine caller/recipient
    SELECT * INTO v_call FROM call_history WHERE id = p_call_id;
    
    IF FOUND THEN
      -- Copy all chat messages from this call to direct_messages
      -- Determine the recipient for each message based on who sent it
      INSERT INTO direct_messages (sender_id, recipient_id, message, created_at, is_from_call, call_id)
      SELECT 
        cm.sender_id,
        CASE 
          WHEN cm.sender_id = v_call.caller_id THEN v_call.recipient_id
          ELSE v_call.caller_id
        END as recipient_id,
        cm.message,
        cm.created_at,
        true,
        p_call_id
      FROM chat_messages cm
      WHERE cm.call_id = p_call_id
      -- Avoid duplicates if function is called multiple times
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CLEANUP DMs ON CONTACT DELETION: Update delete_mutual_contact
-- ============================================================================

-- Update delete_mutual_contact to also delete DMs between the two users
CREATE OR REPLACE FUNCTION delete_mutual_contact(
  p_contact_user_id UUID,
  p_circle_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Validate that the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all direct messages between the two users
  DELETE FROM direct_messages
  WHERE (sender_id = auth.uid() AND recipient_id = p_contact_user_id)
     OR (sender_id = p_contact_user_id AND recipient_id = auth.uid());

  -- Delete the contact from the caller's list
  DELETE FROM contacts
  WHERE user_id = auth.uid()
    AND contact_user_id = p_contact_user_id
    AND (p_circle_id IS NULL OR circle_id = p_circle_id);
  
  -- Delete the reverse contact (caller from the other user's list)
  DELETE FROM contacts
  WHERE user_id = p_contact_user_id
    AND contact_user_id = auth.uid()
    AND (p_circle_id IS NULL OR circle_id = p_circle_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION delete_mutual_contact(UUID, UUID) IS
'Deletes the contact relationship mutually - removes the contact from both users contact lists and all direct messages between them';
