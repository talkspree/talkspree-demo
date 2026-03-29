import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  DirectMessage,
  getConversation,
  sendDirectMessage,
  markMessagesRead,
  subscribeToTyping,
  getConversationKey,
  deleteDirectMessage,
  updateDirectMessage,
} from '@/lib/api/messages';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  isMe: boolean;
  isFromCall: boolean;
  readAt: Date | null;
}

/**
 * Hook for real-time direct messaging between two users.
 * Handles fetching history, subscribing to new messages, typing indicators, and sending.
 */
export function useDirectMessages(
  otherUserId: string | undefined,
  myUserId: string | undefined
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingRef = useRef<{
    channel: RealtimeChannel;
    sendTyping: (isTyping: boolean) => void;
    unsubscribe: () => void;
  } | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transform DB message to ChatMessage
  const transformMessage = useCallback(
    (dm: DirectMessage): ChatMessage => {
      if (!myUserId) throw new Error('No user ID');
      return {
        id: dm.id,
        text: dm.message,
        senderId: dm.sender_id,
        timestamp: new Date(dm.created_at),
        isMe: dm.sender_id === myUserId,
        isFromCall: dm.is_from_call,
        readAt: dm.read_at ? new Date(dm.read_at) : null,
      };
    },
    [myUserId]
  );

  // Fetch conversation history
  useEffect(() => {
    if (!otherUserId || !myUserId) return;

    setIsLoading(true);
    setError(null);

    const fetchHistory = async () => {
      try {
        const data = await getConversation(otherUserId, 100);
        // data is returned newest-first, reverse to show oldest-first
        const transformed = data.reverse().map(transformMessage);
        setMessages(transformed);
      } catch (err: any) {
        console.error('Error fetching conversation:', err);
        setError(err.message || 'Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [otherUserId, myUserId, transformMessage]);

  // Subscribe to real-time messages for this conversation
  useEffect(() => {
    if (!otherUserId || !myUserId) return;

    const channel = supabase
      .channel(`dm-conv:${getConversationKey(myUserId, otherUserId)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${otherUserId}`,
        },
        (payload) => {
          const dm = payload.new as DirectMessage;
          // Only add if this is a message TO me
          if (dm.recipient_id === myUserId) {
            const msg = transformMessage(dm);
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${myUserId}`,
        },
        (payload) => {
          const dm = payload.new as DirectMessage;
          // Only add if this is a message TO the other user (multi-tab sync)
          if (dm.recipient_id === otherUserId) {
            const msg = transformMessage(dm);
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const dm = payload.new as DirectMessage;
          // Update the message in the list
          if (
            (dm.sender_id === myUserId && dm.recipient_id === otherUserId) ||
            (dm.sender_id === otherUserId && dm.recipient_id === myUserId)
          ) {
            const updatedMsg = transformMessage(dm);
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [otherUserId, myUserId, transformMessage]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!otherUserId || !myUserId) return;

    const convKey = getConversationKey(myUserId, otherUserId);
    const typing = subscribeToTyping(convKey, myUserId, (isTyping) => {
      setIsOtherTyping(isTyping);
      // Auto-clear typing after 3 seconds
      if (isTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherTyping(false);
        }, 3000);
      }
    });

    typingRef.current = typing;

    return () => {
      if (typingRef.current) {
        typingRef.current.unsubscribe();
        typingRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [otherUserId, myUserId]);

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!otherUserId || !myUserId) return;
      if (!text.trim()) return;

      try {
        const messageId = await sendDirectMessage(otherUserId, text.trim());

        // Optimistically add the message
        const optimisticMsg: ChatMessage = {
          id: messageId,
          text: text.trim(),
          senderId: myUserId,
          timestamp: new Date(),
          isMe: true,
          isFromCall: false,
          readAt: null,
        };

        setMessages((prev) => {
          if (prev.some((m) => m.id === optimisticMsg.id)) return prev;
          return [...prev, optimisticMsg];
        });

        // Stop typing indicator
        typingRef.current?.sendTyping(false);
      } catch (err: any) {
        console.error('Error sending message:', err);
        setError(err.message || 'Failed to send message');
        throw err;
      }
    },
    [otherUserId, myUserId]
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      typingRef.current?.sendTyping(isTyping);
    },
    []
  );

  // Mark all messages from other user as read
  const markAsRead = useCallback(async () => {
    if (!otherUserId) return;
    try {
      await markMessagesRead(otherUserId);
    } catch (err) {
      console.error('Error marking messages read:', err);
    }
  }, [otherUserId]);

  // Delete a message (unsend)
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteDirectMessage(messageId);
      // The realtime subscription will remove it from the list
    } catch (err) {
      console.error('Error deleting message:', err);
      throw err;
    }
  }, []);

  // Edit a message
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!newText.trim()) return;
    try {
      await updateDirectMessage(messageId, newText.trim());
      // The realtime subscription will update it in the list
    } catch (err) {
      console.error('Error editing message:', err);
      throw err;
    }
  }, []);

  return {
    messages,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    deleteMessage,
    editMessage,
    isOtherTyping,
    isLoading,
    error,
  };
}
