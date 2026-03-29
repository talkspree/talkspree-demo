import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Check, X, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Message {
  id: string;
  type: 'user' | 'correspondent' | 'notification' | 'interaction';
  text: string;
  sender?: string;
  timestamp: Date;
  interactionData?: {
    type: 'extend' | 'topic-change';
    requester?: string;
    myResponse?: 'accepted' | 'declined' | null;
  };
}

interface ChatBoxProps {
  correspondentName: string;
  correspondentPicture?: string;
  myPicture?: string;
  onExtendRequest?: () => void;  // Request extension (initial click)
  onExtendApprove?: () => void;  // Approve their request
  onExtendDecline?: () => void;
  onEndCall?: () => void;
  showExtendPrompt?: boolean;
  iRequested?: boolean;
  theyRequested?: boolean;
  bothAgreed?: boolean;
  theyDeclined?: boolean;
  chatMessages?: Array<{ id: string; text: string; isMe: boolean; timestamp: Date }>;
  onSendMessage?: (text: string) => void;
  className?: string;
}

export function ChatBox({
  correspondentName,
  correspondentPicture,
  myPicture,
  onExtendRequest,
  onExtendApprove,
  onExtendDecline,
  onEndCall,
  showExtendPrompt = false,
  iRequested = false,
  theyRequested = false,
  bothAgreed = false,
  theyDeclined = false,
  chatMessages = [],
  onSendMessage,
  className = ''
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'notification',
      text: `You matched with ${correspondentName}!`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [extendMessageId, setExtendMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousMessageCountRef = useRef(0);

  // Merge system messages with chat messages
  const allMessages = [
    ...messages,
    ...chatMessages.map(msg => ({
      id: msg.id,
      type: msg.isMe ? 'user' as const : 'correspondent' as const,
      text: msg.text,
      sender: msg.isMe ? 'You' : correspondentName,
      timestamp: msg.timestamp,
    }))
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Debug log
  useEffect(() => {
    console.log('📊 ChatBox render - chatMessages count:', chatMessages.length, 'total allMessages:', allMessages.length);
  }, [chatMessages, allMessages]);

  // Add extend notification when prompt appears
  useEffect(() => {
    if (showExtendPrompt && !extendMessageId) {
      const msgId = Date.now().toString();
      const extendMessage: Message = {
        id: msgId,
        type: 'interaction',
        text: 'Call ends in 2 minutes.',
        timestamp: new Date(),
        interactionData: {
          type: 'extend',
          myResponse: null
        }
      };
      setMessages(prev => [...prev, extendMessage]);
      setExtendMessageId(msgId);
    }
  }, [showExtendPrompt, extendMessageId]);

  // Add success notification when both agree
  useEffect(() => {
    if (bothAgreed && extendMessageId) {
      const notification: Message = {
        id: Date.now().toString(),
        type: 'notification',
        text: 'Call extended by 10 minutes!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, notification]);
      setExtendMessageId(null); // Reset so it can trigger again if needed
    }
  }, [bothAgreed, extendMessageId]);

  // Check if user is scrolled to bottom
  const isScrolledToBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return true;
    const threshold = 50; // pixels from bottom
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Handle scroll event to track user's scroll position
  useEffect(() => {
    if (!scrollRef.current) return;
    const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      setShouldAutoScroll(isScrolledToBottom());
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isScrolledToBottom]);

  // Auto-scroll only if user is at bottom or it's a new message
  useEffect(() => {
    const messageCountIncreased = allMessages.length > previousMessageCountRef.current;
    previousMessageCountRef.current = allMessages.length;

    if (!messageCountIncreased) return;

    // Always scroll for the first message or if user is at bottom
    const timer = setTimeout(() => {
      if (scrollRef.current && shouldAutoScroll) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [allMessages, shouldAutoScroll]);

  const handleSend = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue);
      setInputValue('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Always scroll when user sends a message
      setShouldAutoScroll(true);
      setTimeout(() => {
        if (scrollRef.current) {
          const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      }, 100);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExtendResponse = (accept: boolean, messageId: string) => {
    // Mark message as responded
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          interactionData: {
            ...msg.interactionData!,
            myResponse: accept ? 'accepted' : 'declined'
          }
        };
      }
      return msg;
    }));

    // Add notification about the response
    const notification: Message = {
      id: Date.now().toString(),
      type: 'notification',
      text: accept ? 'You accepted the extension request' : 'You declined the extension request',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, notification]);

    // Execute the actual action
    if (accept) {
      // If they requested, I'm approving. Otherwise, I'm requesting.
      if (theyRequested && onExtendApprove) {
        console.log('👍 Approving extension request');
        onExtendApprove();
      } else if (!iRequested && !theyRequested && onExtendRequest) {
        console.log('📤 Requesting extension');
        onExtendRequest();
      }
    } else if (!accept && onExtendDecline) {
      console.log('❌ Declining extension');
      onExtendDecline();
    }
  };

  const emojis = ['😊', '😂', '❤️', '👍', '🎉', '😍', '🤔', '👋', '🔥', '✨', '💯', '🙏', '😎', '🤗', '😢', '🥳'];

  const insertEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-2">
          {allMessages.map((message) => (
            <div key={message.id}>
              {message.type === 'notification' && (
                <div className="flex justify-center">
                  <div className="bg-muted px-4 py-2 rounded-full text-sm">
                    {message.text}
                  </div>
                </div>
              )}
              
              {message.type === 'interaction' && message.interactionData?.type === 'extend' && (
                <div className="flex justify-center">
                  <div className="bg-gradient-primary px-6 py-3 rounded-full flex items-center gap-3">
                    {/* Different text based on state */}
                    {iRequested && !theyRequested ? (
                      <span className="text-white font-medium">Waiting for {correspondentName} to agree...</span>
                    ) : theyRequested ? (
                      <span className="text-white font-medium">{correspondentName} wants to extend the call</span>
                    ) : (
                      <span className="text-white font-medium">{message.text}</span>
                    )}

                    {/* Show buttons based on state */}
                    {theyDeclined ? (
                      // They declined
                      <span className="text-white text-sm font-medium">✗ {correspondentName} declined</span>
                    ) : message.interactionData?.myResponse ? (
                      // Already responded
                      <span className="text-white text-sm">
                        {message.interactionData.myResponse === 'accepted' ? '✓ Accepted' : '✗ Declined'}
                      </span>
                    ) : !iRequested && !theyRequested && !bothAgreed ? (
                      // Initial: Show request button
                      <>
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-white h-8 px-4 rounded-full"
                          onClick={() => handleExtendResponse(true, message.id)}
                        >
                          Extend
                        </Button>
                        <Button
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90 text-white h-8 w-8 p-0 rounded-full"
                          onClick={() => handleExtendResponse(false, message.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : iRequested && !theyRequested && !bothAgreed ? (
                      // Waiting for them
                      <div className="flex items-center gap-1 text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : theyRequested && !iRequested ? (
                      // They requested, I need to approve
                      <>
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-white h-8 px-4 rounded-full"
                          onClick={() => handleExtendResponse(true, message.id)}
                        >
                          Agree
                        </Button>
                        <Button
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90 text-white h-8 w-8 p-0 rounded-full"
                          onClick={() => handleExtendResponse(false, message.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : bothAgreed ? (
                      // Both agreed
                      <div className="flex items-center gap-1 text-white">
                        <Check className="h-4 w-4" />
                        <Check className="h-4 w-4 -ml-2" />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {(message.type === 'user' || message.type === 'correspondent') && (
                <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} gap-2 items-end min-w-0`}>
                  {message.type === 'correspondent' && (
                    <Avatar className="h-8 w-8 mb-5 flex-shrink-0">
                      <AvatarImage src={correspondentPicture} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {correspondentName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className="flex flex-col gap-1 max-w-[70%] min-w-0">
                    <div className={`relative px-4 py-2 ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-[5px]' 
                        : 'bg-muted text-foreground rounded-2xl rounded-bl-[5px]'
                    }`}
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <p className="text-sm whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>{message.text}</p>
                    </div>
                    <span className={`text-xs text-muted-foreground ${
                      message.type === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {message.timestamp.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </span>
                  </div>

                  {message.type === 'user' && (
                    <Avatar className="h-8 w-8 mb-5 flex-shrink-0">
                      <AvatarImage src={myPicture} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        You
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border flex gap-2 items-end">
        <Button 
          size="lg"
          className="bg-destructive hover:bg-destructive/90 text-white"
          onClick={onEndCall}
        >
          END
        </Button>
        <div className="flex-1 flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            placeholder="Type your message here..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none overflow-y-auto"
            rows={1}
          />
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-muted"
                type="button"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="grid grid-cols-8 gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="text-2xl hover:bg-muted rounded p-1 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Button 
          size="icon"
          onClick={handleSend}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
