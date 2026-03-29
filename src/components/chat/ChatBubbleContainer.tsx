import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { useChat, MAX_VISIBLE_BUBBLES, type ChatBubbleData } from '@/contexts/ChatContext';

export function ChatBubbleContainer() {
  const { activeBubbles, openChats, unreadCounts, openChat, minimizeChat, removeBubble } = useChat();
  const [overflowExpanded, setOverflowExpanded] = useState(false);

  if (activeBubbles.length === 0) return null;

  const visibleBubbles = activeBubbles.slice(0, MAX_VISIBLE_BUBBLES);
  const overflowBubbles = activeBubbles.slice(MAX_VISIBLE_BUBBLES);
  const hasOverflow = overflowBubbles.length > 0;

  // Count total unread in overflow
  const overflowUnread = overflowBubbles.reduce(
    (sum, b) => sum + (unreadCounts[b.contactUserId] || 0),
    0
  );

  const handleSelectBubble = (bubble: ChatBubbleData) => {
    openChat(bubble);
  };

  return (
    <div className="fixed right-4 bottom-4 flex flex-col-reverse items-end gap-3 z-50 pointer-events-none">
      {/* Main visible bubbles */}
      <AnimatePresence mode="popLayout">
        {visibleBubbles.map((bubble, index) => (
          <div key={bubble.contactUserId} className="pointer-events-auto">
            <ChatBubble
              bubble={bubble}
              unreadCount={unreadCounts[bubble.contactUserId] || 0}
              isActive={openChats.includes(bubble.contactUserId)}
              index={index}
              onSelect={() => handleSelectBubble(bubble)}
              onMinimize={() => minimizeChat(bubble.contactUserId)}
              onRemove={() => removeBubble(bubble.contactUserId)}
            />
          </div>
        ))}
      </AnimatePresence>

      {/* Overflow bubble (6th+) */}
      {hasOverflow && (
        <div className="pointer-events-auto relative">
          {/* Overflow expanded list */}
          <AnimatePresence>
            {overflowExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="absolute bottom-14 right-0 bg-background border border-border rounded-2xl shadow-2xl p-3 mb-2 min-w-[200px] max-h-[300px] overflow-y-auto"
              >
                <div className="space-y-2">
                  {overflowBubbles.map((bubble) => (
                    <button
                      key={bubble.contactUserId}
                      onClick={() => {
                        handleSelectBubble(bubble);
                        setOverflowExpanded(false);
                      }}
                      className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-white overflow-hidden">
                          <img
                            src={bubble.contactAvatar}
                            alt={bubble.contactName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-background rounded-full ${
                            bubble.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium truncate">{bubble.contactName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {bubble.isOnline ? 'Active now' : 'Offline'}
                        </p>
                      </div>
                      {(unreadCounts[bubble.contactUserId] || 0) > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCounts[bubble.contactUserId]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overflow toggle button */}
          <motion.button
            layout
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOverflowExpanded(!overflowExpanded)}
            className="relative flex items-center justify-center w-12 h-12 rounded-full bg-muted border-2 border-border shadow-lg hover:shadow-xl transition-shadow"
          >
            {/* Stacked avatar preview */}
            <div className="flex items-center justify-center">
              <MessageCircle size={18} className="text-muted-foreground" />
            </div>
            
            {/* Count badge */}
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
              +{overflowBubbles.length}
            </span>

            {/* Unread badge */}
            {overflowUnread > 0 && (
              <span className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md">
                {overflowUnread > 99 ? '99+' : overflowUnread}
              </span>
            )}

            {/* Expand/Collapse indicator */}
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 text-muted-foreground">
              {overflowExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
