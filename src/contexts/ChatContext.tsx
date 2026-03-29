import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  DirectMessage,
  getUnreadDmCounts,
  subscribeToDirectMessages,
  markMessagesRead,
} from '@/lib/api/messages';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface ChatBubbleData {
  contactUserId: string;
  contactName: string;
  contactAvatar: string;
  isOnline: boolean;
}

interface ChatContextType {
  /** Contact user IDs with visible bubbles */
  activeBubbles: ChatBubbleData[];
  /** Contact user IDs with open (expanded) chat windows */
  openChats: string[];
  /** Unread counts per contact user ID */
  unreadCounts: Record<string, number>;
  /** Total unread DM count */
  totalUnread: number;
  /** Open a chat window (also creates a bubble if missing) */
  openChat: (contact: ChatBubbleData) => void;
  /** Close a chat window (removes the window but keeps the bubble) */
  minimizeChat: (contactUserId: string) => void;
  /** Close a chat window AND remove the bubble */
  closeChat: (contactUserId: string) => void;
  /** Remove just the bubble */
  removeBubble: (contactUserId: string) => void;
  /** Mark messages from a contact as read and clear unread count */
  markChatRead: (contactUserId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Max visible bubbles before overflow
export const MAX_VISIBLE_BUBBLES = 5;

// ============================================================================
// Provider
// ============================================================================

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeBubbles, setActiveBubbles] = useState<ChatBubbleData[]>([]);
  const [openChats, setOpenChats] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Total unread count
  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  // Fetch initial unread counts on mount
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      try {
        const counts = await getUnreadDmCounts();
        const countMap: Record<string, number> = {};
        counts.forEach((c) => {
          countMap[c.sender_id] = c.unread_count;
        });
        setUnreadCounts(countMap);

        // Create bubbles for users with unread messages
        if (counts.length > 0) {
          // Fetch profile data for unread senders
          const senderIds = counts.map((c) => c.sender_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, profile_picture_url, is_online')
            .in('id', senderIds);

          if (profiles) {
            const newBubbles: ChatBubbleData[] = profiles.map((p) => ({
              contactUserId: p.id,
              contactName: `${p.first_name} ${p.last_name}`,
              contactAvatar: p.profile_picture_url || '',
              isOnline: p.is_online,
            }));

            setActiveBubbles((prev) => {
              const existingIds = new Set(prev.map((b) => b.contactUserId));
              const toAdd = newBubbles.filter((b) => !existingIds.has(b.contactUserId));
              return [...prev, ...toAdd];
            });
          }
        }
      } catch (err) {
        console.error('Error fetching unread DM counts:', err);
      }
    };

    fetchUnread();
  }, [user?.id]);

  // Subscribe to incoming DMs globally
  useEffect(() => {
    if (!user?.id) return;

    const sub = subscribeToDirectMessages(user.id, async (dm: DirectMessage) => {
      // Only handle messages FROM others (not our own sends)
      if (dm.sender_id === user.id) return;

      // Ignore messages from call - these are historical messages copied when users connected
      if (dm.is_from_call) return;

      const senderId = dm.sender_id;

      // If the chat is open for this sender, mark as read immediately
      // (the chat window component will also do this, but this handles it at context level)
      const isOpen = openChats.includes(senderId);

      if (!isOpen) {
        // Increment unread count
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }

      // Create bubble if it doesn't exist
      setActiveBubbles((prev) => {
        if (prev.some((b) => b.contactUserId === senderId)) return prev;

        // We need the profile data - fetch it
        // Use a fire-and-forget approach
        return prev; // Don't add yet, let the async fetch handle it
      });

      // Fetch profile if bubble doesn't exist
      const bubbleExists = activeBubbles.some((b) => b.contactUserId === senderId);
      if (!bubbleExists) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, profile_picture_url, is_online')
            .eq('id', senderId)
            .single();

          if (profile) {
            setActiveBubbles((prev) => {
              if (prev.some((b) => b.contactUserId === senderId)) return prev;
              return [
                ...prev,
                {
                  contactUserId: profile.id,
                  contactName: `${profile.first_name} ${profile.last_name}`,
                  contactAvatar: profile.profile_picture_url || '',
                  isOnline: profile.is_online,
                },
              ];
            });
          }
        } catch (err) {
          console.error('Error fetching profile for bubble:', err);
        }
      }
    });

    subscriptionRef.current = sub;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
    // Deliberately not including openChats/activeBubbles to avoid re-subscribing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Open a chat window
  const openChat = useCallback((contact: ChatBubbleData) => {
    // Add bubble if not present
    setActiveBubbles((prev) => {
      if (prev.some((b) => b.contactUserId === contact.contactUserId)) return prev;
      return [...prev, contact];
    });

    // Add to open chats
    setOpenChats((prev) => {
      if (prev.includes(contact.contactUserId)) return prev;
      return [...prev, contact.contactUserId];
    });

    // Clear unread count for this contact
    setUnreadCounts((prev) => {
      if (!prev[contact.contactUserId]) return prev;
      const next = { ...prev };
      delete next[contact.contactUserId];
      return next;
    });
  }, []);

  // Minimize chat (close window but keep bubble)
  const minimizeChat = useCallback((contactUserId: string) => {
    setOpenChats((prev) => prev.filter((id) => id !== contactUserId));
  }, []);

  // Close chat (remove window AND bubble)
  const closeChat = useCallback((contactUserId: string) => {
    setOpenChats((prev) => prev.filter((id) => id !== contactUserId));
    setActiveBubbles((prev) => prev.filter((b) => b.contactUserId !== contactUserId));
    // Also clear unread count
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[contactUserId];
      return next;
    });
  }, []);

  // Remove just the bubble
  const removeBubble = useCallback((contactUserId: string) => {
    setActiveBubbles((prev) => prev.filter((b) => b.contactUserId !== contactUserId));
    setOpenChats((prev) => prev.filter((id) => id !== contactUserId));
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[contactUserId];
      return next;
    });
  }, []);

  // Mark messages from a contact as read
  const markChatRead = useCallback(
    async (contactUserId: string) => {
      setUnreadCounts((prev) => {
        if (!prev[contactUserId]) return prev;
        const next = { ...prev };
        delete next[contactUserId];
        return next;
      });

      try {
        await markMessagesRead(contactUserId);
      } catch (err) {
        console.error('Error marking messages read:', err);
      }
    },
    []
  );

  const value: ChatContextType = {
    activeBubbles,
    openChats,
    unreadCounts,
    totalUnread,
    openChat,
    minimizeChat,
    closeChat,
    removeBubble,
    markChatRead,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
