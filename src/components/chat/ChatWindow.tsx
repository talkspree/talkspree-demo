import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Send, Loader2, User, Link2 } from 'lucide-react';
import { ChatMessageBubble } from './ChatMessageBubble';
import type { ChatMessage } from '@/hooks/useDirectMessages';
import { TypingIndicator } from './TypingIndicator';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useChat, type ChatBubbleData } from '@/contexts/ChatContext';
import { useCircle } from '@/contexts/CircleContext';
import { getContacts } from '@/lib/api/contacts';
import type { Connection } from '@/utils/connections';

interface ChatWindowProps {
  contact: ChatBubbleData;
}

export function ChatWindow({ contact }: ChatWindowProps) {
  const { user } = useAuth();
  const { minimizeChat, closeChat, markChatRead } = useChat();
  const { circle } = useCircle();
  const [inputValue, setInputValue] = useState('');
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fullContactData, setFullContactData] = useState<Connection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleViewProfile = async () => {
    // Fetch full contact data if not already loaded
    if (!fullContactData) {
      try {
        const contacts = await getContacts();
        const contactData = contacts.find(c => c.contact_user_id === contact.contactUserId);
        
        if (contactData && contactData.profile) {
          // Convert to Connection format
          const connection: Connection = {
            id: contactData.id,
            userId: contactData.contact_user_id,
            connectedAt: contactData.connected_at,
            user: {
              id: contactData.profile.id,
              firstName: contactData.profile.first_name,
              lastName: contactData.profile.last_name,
              dateOfBirth: contactData.profile.date_of_birth || '2000-01-01',
              gender: contactData.profile.gender || '',
              location: contactData.profile.location || '',
              occupation: contactData.profile.occupation || '',
              bio: contactData.profile.bio || '',
              profilePicture: contactData.profile.profile_picture_url || '',
              role: contactData.profile.role || 'mentee',
              university: contactData.profile.university || '',
              studyField: contactData.profile.study_field || '',
              workPlace: contactData.profile.work_place || '',
              industry: contactData.profile.industry || '',
              phone: '',
              interests: contactData.profile.interests || [],
              isOnline: contactData.profile.is_online,
              inCall: false,
              callStartTime: null,
              sessionDuration: 15,
              instagram: contactData.profile.socialLinks?.find(l => l.platform === 'instagram')?.url || '',
              facebook: contactData.profile.socialLinks?.find(l => l.platform === 'facebook')?.url || '',
              linkedin: contactData.profile.socialLinks?.find(l => l.platform === 'linkedin')?.url || '',
              youtube: contactData.profile.socialLinks?.find(l => l.platform === 'youtube')?.url || '',
              tiktok: contactData.profile.socialLinks?.find(l => l.platform === 'tiktok')?.url || '',
            },
          };
          setFullContactData(connection);
        }
      } catch (err) {
        console.error('Error fetching contact data:', err);
        return;
      }
    }
    setShowProfileModal(true);
  };

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

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOtherTyping, scrollToBottom]);

  // Mark messages as read when chat window opens and when new messages arrive
  useEffect(() => {
    markAsRead();
    markChatRead(contact.contactUserId);
  }, [messages.length, markAsRead, markChatRead, contact.contactUserId]);

  // Focus input on mount
  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleEditStart = useCallback((msg: ChatMessage) => {
    setEditingMessage(msg);
    setInputValue(msg.text);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
      }
    }, 50);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setInputValue('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue('');
    sendTypingIndicator(false);

    if (inputRef.current) inputRef.current.style.height = 'auto';

    if (editingMessage) {
      const msg = editingMessage;
      setEditingMessage(null);
      try {
        await editMessage(msg.id, text);
      } catch (err) {
        console.error('Failed to edit message:', err);
        setInputValue(text);
        setEditingMessage(msg);
      }
      return;
    }

    try {
      await sendMessage(text);
    } catch {
      setInputValue(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }

    // Debounce typing indicator
    sendTypingIndicator(true);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-80 flex flex-col h-[420px] bg-background border border-border rounded-t-2xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-primary p-3 flex items-center justify-between text-white shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-white border-2 border-white/30 overflow-hidden">
              <img
                src={contact.contactAvatar}
                alt={contact.contactName}
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                contact.isOnline ? 'bg-green-400' : 'bg-gray-400'
              }`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight truncate">
              {contact.contactName}
            </h3>
            <p className="text-[10px] opacity-80 leading-tight">
              {contact.isOnline ? 'Active now' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            onClick={handleViewProfile}
            title="View Profile"
          >
            <User size={14} />
          </button>
          <button
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            onClick={() => minimizeChat(contact.contactUserId)}
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            onClick={() => closeChat(contact.contactUserId)}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-chat pl-3 pr-2 mr-0 space-y-0.5 bg-gradient-subtle pt-3">
        {/* Connection context banner */}
        <div className="flex items-center justify-center mb-2">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1 border border-border/50">
            <Link2 size={9} className="shrink-0 opacity-70" />
            Connected through&nbsp;<span className="font-medium">{circle?.name ?? 'Talkspree'}</span>
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground text-center px-4">
            <p>
              No messages yet.
              <br />
              Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              onDelete={deleteMessage}
              onEditStart={handleEditStart}
            />
          ))
        )}
        {isOtherTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <TypingIndicator />
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2.5 bg-background border-t border-border shrink-0">
        {/* Editing banner */}
        {editingMessage && (
          <div className="flex items-center justify-between rounded-lg bg-muted/70 px-3 py-1 mb-1.5 border border-border/50">
            <span className="truncate text-xs font-medium text-muted-foreground">
              Editing:{' '}
              <span className="font-normal">{editingMessage.text}</span>
            </span>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="ml-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex items-center bg-muted border border-border rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/40 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder-muted-foreground resize-none max-h-[120px] overflow-y-auto"
            placeholder={editingMessage ? 'Edit message…' : 'Type a message...'}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            style={{ boxShadow: 'none', minHeight: '20px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={`ml-2 p-1.5 rounded-full transition-all shrink-0 ${
              inputValue.trim()
                ? 'bg-gradient-primary text-white shadow-sm scale-100 hover:opacity-90'
                : 'bg-muted-foreground/20 text-muted-foreground scale-90'
            }`}
          >
            <Send size={13} fill={inputValue.trim() ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </motion.div>

    {/* Profile Modal */}
    {fullContactData && (
      <ContactDetailModal
        contact={fullContactData}
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        onContactDeleted={() => {
          setShowProfileModal(false);
          closeChat(contact.contactUserId);
        }}
      />
    )}
  </>
  );
}
