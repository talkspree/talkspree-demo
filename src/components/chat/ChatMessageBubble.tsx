import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ChatMessage } from '@/hooks/useDirectMessages';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onDelete: (messageId: string) => Promise<void>;
  onEditStart: (message: ChatMessage) => void;
}

export function ChatMessageBubble({ message, onDelete, onEditStart }: ChatMessageBubbleProps) {
  const isMe = message.isMe;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline ${isMe ? 'text-white/90 hover:text-white' : 'text-primary hover:text-primary/80'}`}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleConfirmUnsend = async () => {
    setIsDeleting(true);
    try {
      await onDelete(message.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`group flex flex-col w-full mb-2 ${isMe ? 'items-end' : 'items-start'}`}
      >
        {/* Three-dots button (left of bubble) + bubble row */}
        {/* max-w lives on the wrapper so the bubble's percentage is well-defined */}
        <div className="flex items-center gap-1 max-w-[84%]">
          {/* Options menu — left of bubble, only visible on hover */}
          {isMe && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-0.5 hover:bg-muted rounded-full transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical size={12} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                className="w-36 z-[200]"
              >
                <DropdownMenuItem onClick={() => onEditStart(message)} className="cursor-pointer">
                  <Edit2 size={14} className="mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 size={14} className="mr-2" />
                  Unsend
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Message bubble — fills remaining width of the constrained wrapper */}
          <div
            className={`min-w-0 px-3 py-2 text-sm leading-relaxed shadow-sm ${
              isMe
                ? 'bg-gradient-primary text-white rounded-2xl rounded-br-none'
                : 'bg-card text-foreground rounded-2xl rounded-bl-none border border-border'
            }`}
          >
            {message.isFromCall && (
              <div
                className={`text-[10px] mb-1 font-medium uppercase tracking-wider ${
                  isMe ? 'text-white/60' : 'text-muted-foreground'
                }`}
              >
                from call
              </div>
            )}
            <span className="break-words whitespace-pre-wrap">
              {renderMessageText(message.text)}
            </span>
          </div>
        </div>

        {/* Timestamp below the bubble */}
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </motion.div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsend message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be removed for everyone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnsend}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Unsending...' : 'Unsend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
