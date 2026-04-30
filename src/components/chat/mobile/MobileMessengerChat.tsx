import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, SendHorizontal, Smile } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat, type ChatBubbleData } from '@/contexts/ChatContext';
import { useDirectMessages, type ChatMessage } from '@/hooks/useDirectMessages';
import { useCircle } from '@/contexts/CircleContext';
import { TypingIndicator } from '../TypingIndicator';
import { EmojiPicker } from './EmojiPicker';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import { getContacts } from '@/lib/api/contacts';
import type { Connection } from '@/utils/connections';

interface MobileMessengerChatProps {
  contact: ChatBubbleData;
  onBack: () => void;
}

/**
 * Full-screen mobile chat view styled after iOS Messenger / Facebook Messenger.
 * Bubbles use grouped rounded corners when the same sender posts consecutive
 * messages (no chat-head bubbles, no avatars stacked).
 */
export function MobileMessengerChat({ contact, onBack }: MobileMessengerChatProps) {
  const { user } = useAuth();
  const { closeMobileMessenger, markChatRead } = useChat();
  const { circle } = useCircle();

  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [activeMenuMessage, setActiveMenuMessage] = useState<ChatMessage | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [fullContactData, setFullContactData] = useState<Connection | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the initial batch of messages has been scrolled into view
  // already. On first load we scroll instantly (no animation); subsequent
  // messages scroll smoothly so the user sees the new bubble arrive.
  const initialScrollDoneRef = useRef(false);

  const {
    messages,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    deleteMessage,
    editMessage,
    isOtherTyping,
    isLoading,
  } = useDirectMessages(contact.contactUserId, user?.id);

  // Auto-scroll to bottom.
  // – Initial load: instant jump (avoids the animated "race from top" glitch).
  // – New messages / typing: smooth scroll so the arrival feels natural.
  useEffect(() => {
    if (!messagesEndRef.current) return;

    if (!initialScrollDoneRef.current && messages.length > 0) {
      // First time we have messages — jump instantly to the bottom.
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
      initialScrollDoneRef.current = true;
    } else if (initialScrollDoneRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOtherTyping]);

  // Mark messages as read when this view opens or new messages arrive
  useEffect(() => {
    markAsRead();
    markChatRead(contact.contactUserId);
  }, [messages.length, markAsRead, markChatRead, contact.contactUserId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setEmojiPickerOpen(false);
    sendTypingIndicator(false);

    if (editingMessage) {
      try {
        await editMessage(editingMessage.id, text);
      } catch (err) {
        console.error('Failed to edit message:', err);
        setInputText(text);
      } finally {
        setEditingMessage(null);
      }
      return;
    }

    try {
      await sendMessage(text);
    } catch {
      // Restore text so user doesn't lose their message
      setInputText(text);
    }
  }, [inputText, editingMessage, editMessage, sendMessage, sendTypingIndicator]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTypingIndicator(true);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const handleEmojiSelect = useCallback((emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setInputText((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? inputText.length;
    const end = input.selectionEnd ?? inputText.length;
    const next = inputText.slice(0, start) + emoji + inputText.slice(end);
    setInputText(next);
    // Restore cursor after the inserted emoji on the next tick
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
    });
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleViewProfile = useCallback(async () => {
    if (!fullContactData) {
      try {
        const list = await getContacts();
        const c = list.find((x) => x.contact_user_id === contact.contactUserId);
        if (c && c.profile) {
          const conn: Connection = {
            id: c.id,
            userId: c.contact_user_id,
            connectedAt: c.connected_at,
            user: {
              id: c.profile.id,
              firstName: c.profile.first_name,
              lastName: c.profile.last_name,
              dateOfBirth: c.profile.date_of_birth || '2000-01-01',
              gender: c.profile.gender || '',
              location: c.profile.location || '',
              occupation: c.profile.occupation || '',
              bio: c.profile.bio || '',
              profilePicture: c.profile.profile_picture_url || '',
              role: (c.profile.role as Connection['user']['role']) || 'mentee',
              university: c.profile.university || '',
              studyField: c.profile.study_field || '',
              workPlace: c.profile.work_place || '',
              industry: c.profile.industry || '',
              phone: '',
              interests: c.profile.interests || [],
              isOnline: c.profile.is_online,
              inCall: false,
              callStartTime: null,
              sessionDuration: 15,
              instagram:
                c.profile.socialLinks?.find((l) => l.platform === 'instagram')?.url || '',
              facebook:
                c.profile.socialLinks?.find((l) => l.platform === 'facebook')?.url || '',
              linkedin:
                c.profile.socialLinks?.find((l) => l.platform === 'linkedin')?.url || '',
              youtube:
                c.profile.socialLinks?.find((l) => l.platform === 'youtube')?.url || '',
              tiktok:
                c.profile.socialLinks?.find((l) => l.platform === 'tiktok')?.url || '',
            },
          };
          setFullContactData(conn);
        }
      } catch (err) {
        console.error('Error loading contact profile:', err);
        return;
      }
    }
    setProfileOpen(true);
  }, [contact.contactUserId, fullContactData]);

  const initials = useMemo(
    () =>
      contact.contactName
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    [contact.contactName]
  );

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white/90 px-2 backdrop-blur-md pt-[max(env(safe-area-inset-top),0.5rem)] pb-2">
        <div className="flex min-w-0 items-center gap-1 pr-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0084FF] transition-colors hover:bg-gray-100 active:bg-gray-200"
            aria-label="Back"
          >
            <ChevronLeft className="h-8 w-8" strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={handleViewProfile}
            className="flex min-w-0 items-center gap-2.5 rounded-2xl py-1 pr-2 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="relative shrink-0">
              {contact.contactAvatar ? (
                <img
                  src={contact.contactAvatar}
                  alt={contact.contactName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
                  {initials || '?'}
                </div>
              )}
              {contact.isOnline && (
                <div className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-white bg-green-500" />
              )}
            </div>
            <div className="flex min-w-0 flex-col overflow-hidden text-left">
              <span className="truncate text-[15px] font-semibold leading-tight tracking-tight text-gray-900">
                {contact.contactName}
              </span>
              <span className="text-[12px] leading-tight text-gray-500">
                {contact.isOnline ? 'Active now' : 'Offline'}
              </span>
            </div>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 px-2 text-[#0084FF]">
          <button
            type="button"
            onClick={handleViewProfile}
            className="rounded-full px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-gray-100 active:bg-gray-200"
          >
            View Profile
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4 hide-scrollbar">
        {/* Conversation header card */}
        <div className="flex flex-col items-center pb-8 pt-4">
          {contact.contactAvatar ? (
            <img
              src={contact.contactAvatar}
              alt={contact.contactName}
              className="mb-3 h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-2xl font-semibold text-white">
              {initials || '?'}
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900">{contact.contactName}</h2>
          <p className="mt-1 text-sm text-gray-500">Talkspree</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Connected through {circle?.name || 'the Network'}
          </p>
        </div>

        {isLoading && messages.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No messages yet. Say hi!
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.isMe;
            const next = messages[index + 1];
            const prev = messages[index - 1];
            const isNextSameSender = next?.senderId === message.senderId;
            const isPrevSameSender = prev?.senderId === message.senderId;

            let bubbleClasses = 'rounded-2xl';
            if (isMe) {
              if (isPrevSameSender) bubbleClasses += ' rounded-tr-[5px]';
              if (isNextSameSender) bubbleClasses += ' rounded-br-[5px]';
            } else {
              if (isPrevSameSender) bubbleClasses += ' rounded-tl-[5px]';
              if (isNextSameSender) bubbleClasses += ' rounded-bl-[5px]';
            }

            const marginTop = isPrevSameSender ? 'mt-0.5' : 'mt-3';
            const showAvatar = !isMe && !isNextSameSender;
            const reservesAvatarSpace = !isMe && isNextSameSender;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={message.id}
                className={`flex w-full ${
                  isMe ? 'justify-end' : 'justify-start'
                } ${marginTop}`}
              >
                {showAvatar && (
                  <div className="mr-2 shrink-0 self-end">
                    {contact.contactAvatar ? (
                      <img
                        src={contact.contactAvatar}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-[10px] font-semibold text-white">
                        {initials || '?'}
                      </div>
                    )}
                  </div>
                )}
                {reservesAvatarSpace && <div className="w-9 shrink-0" />}

                <div
                  onContextMenu={(e) => {
                    if (isMe) {
                      e.preventDefault();
                      setActiveMenuMessage(message);
                    }
                  }}
                  onClick={() => {
                    if (isMe) {
                      setActiveMenuMessage(message);
                    }
                  }}
                  style={{ WebkitTouchCallout: 'none' as const }}
                  className={`relative max-w-[75%] select-none px-4 py-2 text-[15px] leading-snug ${bubbleClasses} ${
                    isMe
                      ? 'cursor-pointer bg-[#0084FF] text-white'
                      : 'bg-[#F0F2F5] text-black'
                  }`}
                >
                  {message.isFromCall && (
                    <div
                      className={`mb-1 text-[10px] font-medium uppercase tracking-wider ${
                        isMe ? 'text-white/60' : 'text-gray-500'
                      }`}
                    >
                      from call
                    </div>
                  )}
                  <span className="whitespace-pre-wrap break-words">{message.text}</span>
                </div>
              </motion.div>
            );
          })
        )}

        {isOtherTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex w-full justify-start"
          >
            <div className="ml-9">
              <TypingIndicator />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input */}
      <footer className="relative z-10 flex shrink-0 flex-col gap-2 border-t border-gray-100 bg-white p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {/* Emoji picker anchored above the footer */}
        <EmojiPicker
          open={emojiPickerOpen}
          onClose={() => setEmojiPickerOpen(false)}
          onSelect={handleEmojiSelect}
        />

        {editingMessage && (
          <div className="mx-2 mb-1 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1">
            <span className="truncate text-sm font-medium text-gray-600">
              Editing:{' '}
              <span className="font-normal text-gray-500">{editingMessage.text}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setEditingMessage(null);
                setInputText('');
              }}
              className="ml-2 p-1 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex w-full flex-row items-center gap-2">
          <div className="relative flex min-h-[40px] flex-1 items-center rounded-full bg-gray-100 px-3 pl-4">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMessage ? 'Edit message…' : 'Message…'}
              className="w-full bg-transparent py-2.5 text-[15px] placeholder-gray-500 outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setEmojiPickerOpen((prev) => !prev);
              }}
              className={`ml-2 shrink-0 p-1 transition-colors ${
                emojiPickerOpen ? 'text-blue-600' : 'text-[#0084FF] hover:text-blue-600'
              }`}
              aria-label="Insert emoji"
              aria-expanded={emojiPickerOpen}
            >
              <Smile className="h-6 w-6" strokeWidth={2} />
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {inputText.trim() && (
              <motion.button
                key="send"
                type="button"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={handleSend}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-sm transition-colors active:bg-blue-600"
                aria-label="Send"
              >
                <SendHorizontal className="-ml-0.5 h-5 w-5" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </footer>

      {/* Profile modal (re-uses existing desktop modal which already supports mobile) */}
      {fullContactData && (
        <ContactDetailModal
          contact={fullContactData}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          onContactDeleted={() => {
            setProfileOpen(false);
            // The contact no longer exists - close out of the messenger entirely.
            closeMobileMessenger();
          }}
        />
      )}

      {/* Message context action sheet */}
      <AnimatePresence>
        {activeMenuMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveMenuMessage(null)}
            className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50 p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="overflow-hidden rounded-3xl bg-white shadow-xl"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessage(activeMenuMessage);
                    setInputText(activeMenuMessage.text);
                    setActiveMenuMessage(null);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="w-full border-b border-gray-100 py-4 text-center text-[17px] transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  Edit message
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = activeMenuMessage.id;
                    setActiveMenuMessage(null);
                    try {
                      await deleteMessage(id);
                    } catch (err) {
                      console.error('Failed to delete message:', err);
                    }
                  }}
                  className="w-full border-b border-gray-100 py-4 text-center text-[17px] font-medium text-red-500 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  Unsend for everyone
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMenuMessage(null)}
                  className="w-full py-4 text-center text-[17px] font-semibold transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
