import { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat, type ChatBubbleData } from '@/contexts/ChatContext';
import { getContacts } from '@/lib/api/contacts';
import {
  getInboxConversations,
  type InboxConversation,
  type DirectMessage,
} from '@/lib/api/messages';
import { supabase } from '@/lib/supabase';

interface ContactInfo {
  contactUserId: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

interface InboxRow extends ContactInfo {
  lastMessage: string;
  lastMessageAt: Date | null;
  lastMessageFromMe: boolean;
  unreadCount: number;
  isFromCall: boolean;
}

interface MobileMessengerInboxProps {
  onClose: () => void;
  onOpenConversation: (contact: ChatBubbleData) => void;
}

/**
 * Format a chat list timestamp similar to iOS/Messenger:
 *  - Today: "10:30 AM"
 *  - This week: "Tuesday"
 *  - Older: "Oct 12"
 */
function formatInboxTime(d: Date): string {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const diffMs = now.getTime() - d.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (diffMs < sevenDays) {
    return d.toLocaleDateString([], { weekday: 'long' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function MobileMessengerInbox({
  onClose,
  onOpenConversation,
}: MobileMessengerInboxProps) {
  const { user } = useAuth();
  const { unreadCounts } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Record<string, ContactInfo>>({});
  const [conversations, setConversations] = useState<
    Record<string, InboxConversation>
  >({});
  const [loading, setLoading] = useState(true);

  // Fetch contacts (so users without conversations still show up) and the latest
  // message per conversation in parallel.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([getContacts(), getInboxConversations()])
      .then(([contactList, convs]) => {
        if (cancelled) return;

        const contactMap: Record<string, ContactInfo> = {};
        for (const c of contactList) {
          if (!c.profile) continue;
          const name = `${c.profile.first_name} ${c.profile.last_name}`.trim();
          contactMap[c.contact_user_id] = {
            contactUserId: c.contact_user_id,
            name: name || 'Unknown',
            avatar: c.profile.profile_picture_url || '',
            isOnline: !!c.profile.is_online,
          };
        }
        setContacts(contactMap);

        const convMap: Record<string, InboxConversation> = {};
        for (const conv of convs) {
          convMap[conv.otherUserId] = conv;
        }

        // Some conversations may be with users that aren't in the contact list
        // anymore (e.g. removed). Hydrate their basic info from profiles so the
        // user still sees the thread.
        const missingIds = convs
          .map((c) => c.otherUserId)
          .filter((id) => !contactMap[id]);

        if (missingIds.length > 0) {
          supabase
            .from('profiles')
            .select('id, first_name, last_name, profile_picture_url, is_online')
            .in('id', missingIds)
            .then(({ data }) => {
              if (cancelled || !data) return;
              setContacts((prev) => {
                const next = { ...prev };
                for (const p of data) {
                  if (next[p.id]) continue;
                  next[p.id] = {
                    contactUserId: p.id,
                    name: `${p.first_name} ${p.last_name}`.trim() || 'Unknown',
                    avatar: p.profile_picture_url || '',
                    isOnline: !!p.is_online,
                  };
                }
                return next;
              });
            });
        }

        setConversations(convMap);
      })
      .catch((err) => console.error('Error loading inbox:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Realtime: keep conversation previews fresh on insert/update/delete.
  useEffect(() => {
    if (!user?.id) return;

    const handleChange = (dm: DirectMessage) => {
      const otherUserId =
        dm.sender_id === user.id ? dm.recipient_id : dm.sender_id;
      setConversations((prev) => {
        const existing = prev[otherUserId];
        // Only keep this preview if it's newer than what we have.
        if (existing && new Date(existing.lastMessageAt) >= new Date(dm.created_at)) {
          return prev;
        }
        return {
          ...prev,
          [otherUserId]: {
            otherUserId,
            lastMessage: dm.message,
            lastMessageAt: dm.created_at,
            lastMessageFromMe: dm.sender_id === user.id,
            isFromCall: dm.is_from_call,
          },
        };
      });
    };

    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => handleChange(payload.new as DirectMessage)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => handleChange(payload.new as DirectMessage)
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
          if (dm.sender_id !== user.id && dm.recipient_id !== user.id) return;
          handleChange(dm);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          // The deleted message's row only contains the id by default; re-fetch
          // to recompute the latest-per-conversation map.
          getInboxConversations()
            .then((convs) => {
              const next: Record<string, InboxConversation> = {};
              for (const c of convs) next[c.otherUserId] = c;
              setConversations(next);
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const rows = useMemo<InboxRow[]>(() => {
    const ids = new Set<string>([
      ...Object.keys(contacts),
      ...Object.keys(conversations),
    ]);
    const list: InboxRow[] = [];
    for (const id of ids) {
      const c = contacts[id];
      if (!c) continue;
      const conv = conversations[id];
      list.push({
        ...c,
        lastMessage: conv?.lastMessage ?? '',
        lastMessageAt: conv ? new Date(conv.lastMessageAt) : null,
        lastMessageFromMe: conv?.lastMessageFromMe ?? false,
        unreadCount: unreadCounts[id] ?? 0,
        isFromCall: conv?.isFromCall ?? false,
      });
    }
    list.sort((a, b) => {
      // Conversations with messages first, sorted by most recent
      if (a.lastMessageAt && b.lastMessageAt) {
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      // Both have no messages: alphabetical
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [contacts, conversations, unreadCounts]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const handleOpen = useCallback(
    (row: InboxRow) => {
      onOpenConversation({
        contactUserId: row.contactUserId,
        contactName: row.name,
        contactAvatar: row.avatar,
        isOnline: row.isOnline,
      });
    },
    [onOpenConversation]
  );

  return (
    <div className="flex h-full flex-col bg-white text-gray-900">
      {/* Header */}
      <header className="px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)] shrink-0">
        <div className="flex items-center gap-3 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-900 transition-colors hover:bg-gray-200 active:bg-gray-300"
            aria-label="Close messenger"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>
          <h1 className="flex-1 text-[28px] font-bold tracking-tight text-gray-900">
            Chats
          </h1>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-full bg-gray-100 py-2.5 pl-10 pr-4 text-[15px] text-gray-900 placeholder-gray-500 transition-colors focus:bg-gray-200 focus:outline-none"
          />
        </div>
      </header>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pt-1">
        {loading && rows.length === 0 ? (
          <div className="mt-12 text-center text-sm text-gray-500">
            Loading conversations…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="mt-12 px-6 text-center text-sm text-gray-500">
            {searchQuery
              ? 'No contacts found.'
              : 'No conversations yet. Add a contact to start chatting.'}
          </div>
        ) : (
          filteredRows.map((row) => (
            <ContactRow key={row.contactUserId} row={row} onClick={() => handleOpen(row)} />
          ))
        )}
        <div className="h-[max(env(safe-area-inset-bottom),1rem)]" />
      </div>
    </div>
  );
}

function ContactRow({ row, onClick }: { row: InboxRow; onClick: () => void }) {
  const hasUnread = row.unreadCount > 0;
  const initials = row.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const preview = row.lastMessage
    ? `${row.lastMessageFromMe ? 'You: ' : ''}${row.lastMessage}`
    : 'Tap to start a conversation';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {row.avatar ? (
          <img
            src={row.avatar}
            alt={row.name}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-base font-semibold text-white">
            {initials || '?'}
          </div>
        )}
        {row.isOnline && (
          <div className="absolute bottom-0 right-0 h-[15px] w-[15px] rounded-full border-[2.5px] border-white bg-green-500" />
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-1 flex-col overflow-hidden pl-1">
        <div className="flex items-center justify-between gap-2">
          <h3
            className={`truncate text-[15px] ${
              hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
            }`}
          >
            {row.name}
          </h3>
          {row.lastMessageAt && (
            <span
              className={`shrink-0 text-xs ${
                hasUnread ? 'font-bold text-gray-900' : 'text-gray-500'
              }`}
            >
              {formatInboxTime(row.lastMessageAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              hasUnread
                ? 'font-semibold text-gray-900'
                : row.lastMessage
                ? 'text-gray-500'
                : 'italic text-gray-400'
            }`}
          >
            {preview}
          </p>
          {hasUnread && (
            <span className="min-w-[20px] shrink-0 rounded-full bg-[#0084FF] px-1.5 py-0.5 text-center text-[10px] font-bold text-white shadow-sm">
              {row.unreadCount > 99 ? '99+' : row.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
