import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Edit2, Trash2, Check, X } from 'lucide-react';
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
  onEdit: (messageId: string, newText: string) => Promise<void>;
}

export function ChatMessageBubble({ message, onDelete, onEdit }: ChatMessageBubbleProps) {
  const isMe = message.isMe;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Linkify URLs in the message text
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

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(message.text);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim() || editValue === message.text) {
      setIsEditing(false);
      return;
    }
    try {
      await onEdit(message.id, editValue);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(message.text);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
    
    // Auto-resize textarea
    if (editInputRef.current) {
      editInputRef.current.style.height = 'auto';
      editInputRef.current.style.height = `${Math.min(editInputRef.current.scrollHeight, 120)}px`;
    }
  };

  // Auto-focus and resize when entering edit mode
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.style.height = 'auto';
      editInputRef.current.style.height = `${Math.min(editInputRef.current.scrollHeight, 120)}px`;
    }
  }, [isEditing]);

  const handleUnsend = () => {
    setShowDeleteConfirm(true);
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
        {/* Message bubble */}
        <div
          className={`max-w-[80%] px-3 py-2 text-sm leading-relaxed shadow-sm ${
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
          
          {/* Edit mode */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <textarea
                ref={editInputRef}
                rows={1}
                value={editValue}
                onChange={handleEditInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="flex bg-white/20 border border-white/30 rounded px-2 py-1 text-sm text-white placeholder-white/50 outline-none focus:border-white/50 resize-none max-h-[120px] overflow-y-auto"
                style={{ minHeight: '20px' }}
              />
              <div className="flex-col max-w-[20px]">
                <button
                  onClick={handleSaveEdit}
                  className="p-1 hover:bg-white/20 rounded transition-colors shrink-0"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-white/20 rounded transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <span className="break-words whitespace-pre-wrap">
              {renderMessageText(message.text)}
            </span>
          )}
        </div>

        {/* Timestamp and options menu - outside bubble */}
        {!isEditing && (
          <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-[10px] text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {/* Options menu (only for own messages) */}
            {isMe && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-0.5 hover:bg-muted rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical size={12} className="text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align={isMe ? 'end' : 'start'}
                  side="top"
                  className="w-36"
                >
                  <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                    <Edit2 size={14} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleUnsend}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Unsend
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
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
