import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ChatBubbleData } from '@/contexts/ChatContext';

interface ChatBubbleProps {
  bubble: ChatBubbleData;
  unreadCount: number;
  isActive: boolean;
  index: number;
  onSelect: () => void;
  onMinimize: () => void;
  onRemove: () => void;
}

export function ChatBubble({
  bubble,
  unreadCount,
  isActive,
  index,
  onSelect,
  onMinimize,
  onRemove,
}: ChatBubbleProps) {
  const handleClick = () => {
    if (isActive) {
      onMinimize();
    } else {
      onSelect();
    }
  };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{
        delay: index * 0.05,
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      className="relative group"
    >
      {/* Close Button (appears on hover) */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1 -left-1 z-20 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <X size={10} />
      </motion.button>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 z-20 min-w-[20px] h-5 px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.div>
      )}

      {/* Avatar Button */}
      <motion.button
        whileHover={{ scale: 1.1, x: -2, transition: { duration: 0.1 } }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className={`relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all bg-white ${
          isActive
            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            : 'cursor-pointer hover:shadow-xl'
        }`}
      >
        <img
          src={bubble.contactAvatar}
          alt={bubble.contactName}
          className="w-full h-full rounded-full object-cover"
        />
        {/* Online indicator */}
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-background rounded-full ${
            bubble.isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      </motion.button>

      {/* Name Tooltip */}
      <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-foreground text-background text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
        {bubble.contactName}
      </div>
    </motion.div>
  );
}
