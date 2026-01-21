import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  timestamp: Date;
  isMe: boolean;
}

interface DbChatMessage {
  id: string;
  call_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export function useSupabaseChat(
  callId: string | undefined, 
  myUserId: string | undefined, 
  myName: string = 'You'
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Transform database message to ChatMessage format
  const transformMessage = useCallback((dbMsg: DbChatMessage, userId: string): ChatMessage => {
    return {
      id: dbMsg.id,
      text: dbMsg.message,
      senderId: dbMsg.sender_id,
      timestamp: new Date(dbMsg.created_at),
      isMe: dbMsg.sender_id === userId,
    };
  }, []);

  // Initialize chat and subscribe to messages
  useEffect(() => {
    if (!callId || !myUserId) {
      console.log('⚠️ Supabase Chat not initialized - missing callId or userId', {
        hasCallId: !!callId,
        hasUserId: !!myUserId,
      });
      return;
    }

    console.log('🚀 Initializing Supabase chat...', { callId, myUserId });

    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('call_id', callId)
          .order('created_at', { ascending: true });

        if (fetchError) {
          console.error('❌ Failed to fetch chat messages:', fetchError);
          setError(fetchError.message);
          return;
        }

        if (data) {
          const transformed = data.map((msg: DbChatMessage) => transformMessage(msg, myUserId));
          setMessages(transformed);
          console.log(`📥 Loaded ${data.length} existing messages`);
        }
      } catch (err: any) {
        console.error('❌ Error fetching messages:', err);
        setError(err.message || 'Failed to fetch messages');
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          console.log('📨 New message received:', payload.new);
          const newMsg = transformMessage(payload.new as DbChatMessage, myUserId);
          
          // Only add if not already in messages (avoid duplicates from own sends)
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Chat subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          console.log('✅ Supabase chat connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('Chat connection lost');
          console.log('❌ Chat subscription failed:', status);
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up Supabase chat...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [callId, myUserId, transformMessage]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!callId || !myUserId) {
      console.error('❌ Cannot send message - not connected');
      return;
    }

    if (!text.trim()) {
      console.log('⚠️ Empty message, skipping');
      return;
    }

    console.log('📤 Sending message via Supabase:', text);

    try {
      const { data, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          call_id: callId,
          sender_id: myUserId,
          message: text.trim(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to send message:', insertError);
        setError(insertError.message);
        throw insertError;
      }

      console.log('✅ Message sent successfully:', data?.id);
      
      // The realtime subscription will add the message to the list
      // But we can add it immediately for better UX (with deduplication in the subscription handler)
      if (data) {
        const newMsg = transformMessage(data as DbChatMessage, myUserId);
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
    } catch (err: any) {
      console.error('❌ Error sending message:', err);
      setError(err.message || 'Failed to send message');
      throw err;
    }
  }, [callId, myUserId, transformMessage]);

  // Clear messages (called when call ends)
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isConnected,
    error,
  };
}

