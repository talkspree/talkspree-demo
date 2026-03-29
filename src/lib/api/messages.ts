import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  is_from_call: boolean;
  call_id: string | null;
}

export interface UnreadCount {
  sender_id: string;
  unread_count: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Send a direct message to a contact
 */
export async function sendDirectMessage(
  recipientId: string,
  message: string
): Promise<string> {
  const { data, error } = await supabase.rpc('send_direct_message', {
    p_recipient_id: recipientId,
    p_message: message,
  });

  if (error) {
    console.error('Error sending DM:', error);
    throw error;
  }

  return data as string;
}

/**
 * Get conversation history between current user and another user
 * Returns messages in reverse chronological order (newest first)
 */
export async function getConversation(
  otherUserId: string,
  limit: number = 50,
  before?: string
): Promise<DirectMessage[]> {
  const { data, error } = await supabase.rpc('get_conversation', {
    p_other_user_id: otherUserId,
    p_limit: limit,
    p_before: before || null,
  });

  if (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }

  return (data as DirectMessage[]) || [];
}

/**
 * Mark all messages from a sender as read
 */
export async function markMessagesRead(senderId: string): Promise<number> {
  const { data, error } = await supabase.rpc('mark_messages_read', {
    p_sender_id: senderId,
  });

  if (error) {
    console.error('Error marking messages read:', error);
    throw error;
  }

  return data as number;
}

/**
 * Get unread message counts per contact
 */
export async function getUnreadDmCounts(): Promise<UnreadCount[]> {
  const { data, error } = await supabase.rpc('get_unread_dm_counts');

  if (error) {
    console.error('Error fetching unread counts:', error);
    throw error;
  }

  return (data as UnreadCount[]) || [];
}

/**
 * Subscribe to new direct messages for the current user (real-time)
 * Returns the channel and an unsubscribe function
 */
export function subscribeToDirectMessages(
  userId: string,
  onNewMessage: (message: DirectMessage) => void
) {
  const channel = supabase
    .channel(`dm:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        onNewMessage(payload.new as DirectMessage);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `sender_id=eq.${userId}`,
      },
      (payload) => {
        // Also receive own messages (for multi-tab sync)
        onNewMessage(payload.new as DirectMessage);
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to typing indicators for a conversation using Realtime Broadcast
 */
export function subscribeToTyping(
  conversationKey: string,
  userId: string,
  onTyping: (isTyping: boolean, senderId: string) => void
) {
  const channel = supabase.channel(`typing:${conversationKey}`);

  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      if (payload.payload.userId !== userId) {
        onTyping(payload.payload.isTyping, payload.payload.userId);
      }
    })
    .subscribe();

  const sendTyping = (isTyping: boolean) => {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping },
    });
  };

  return {
    channel,
    sendTyping,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Get a conversation key for two user IDs (deterministic ordering)
 */
export function getConversationKey(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join(':');
}

/**
 * Delete a direct message (unsend)
 */
export async function deleteDirectMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('direct_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

/**
 * Update a direct message (edit)
 */
export async function updateDirectMessage(
  messageId: string,
  newMessage: string
): Promise<void> {
  const { error } = await supabase
    .from('direct_messages')
    .update({ message: newMessage })
    .eq('id', messageId);

  if (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}
