import { useState, useRef, useEffect } from 'react';
import { Send, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  id: string;
  type: 'user' | 'correspondent' | 'notification' | 'interaction';
  text: string;
  sender?: string;
  timestamp: Date;
  interactionData?: {
    type: 'extend' | 'topic-change';
    requester?: string;
    responded?: boolean;
    accepted?: boolean;
  };
}

interface ChatBoxProps {
  correspondentName: string;
  onExtendAccept?: () => void;
  onExtendDecline?: () => void;
  onEndCall?: () => void;
  showExtendPrompt?: boolean;
  className?: string;
}

export function ChatBox({ 
  correspondentName, 
  onExtendAccept,
  onExtendDecline,
  onEndCall,
  showExtendPrompt = false,
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
  const [extendRequestState, setExtendRequestState] = useState<'pending' | 'accepted' | 'declined' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showExtendPrompt && !extendRequestState) {
      const extendMessage: Message = {
        id: Date.now().toString(),
        type: 'interaction',
        text: 'Call ends in 2 minutes.',
        timestamp: new Date(),
        interactionData: {
          type: 'extend',
          responded: false
        }
      };
      setMessages(prev => [...prev, extendMessage]);
    }
  }, [showExtendPrompt, extendRequestState]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        text: inputValue,
        sender: 'You',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      setInputValue('');
    }
  };

  const handleExtendResponse = (accept: boolean) => {
    setExtendRequestState(accept ? 'accepted' : 'declined');
    
    if (accept && onExtendAccept) {
      onExtendAccept();
      const notification: Message = {
        id: Date.now().toString(),
        type: 'notification',
        text: 'Call extended by 10 minutes!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, notification]);
    } else if (!accept && onExtendDecline) {
      onExtendDecline();
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
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
                    <span className="text-white font-medium">{message.text}</span>
                    {extendRequestState === null ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-white h-8 px-4 rounded-full"
                          onClick={() => handleExtendResponse(true)}
                        >
                          Extend
                        </Button>
                        <Button
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90 text-white h-8 w-8 p-0 rounded-full"
                          onClick={() => handleExtendResponse(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : extendRequestState === 'accepted' ? (
                      <div className="flex items-center gap-1 text-white">
                        <Check className="h-4 w-4" />
                        <Check className="h-4 w-4 -ml-2" />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {(message.type === 'user' || message.type === 'correspondent') && (
                <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                  {message.type === 'correspondent' && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {correspondentName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                  </div>
                  {message.type === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
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

      <div className="p-4 border-t border-border flex gap-2">
        <Button 
          size="lg"
          className="bg-destructive hover:bg-destructive/90 text-white"
          onClick={onEndCall}
        >
          END
        </Button>
        <Input
          placeholder="Type your message here..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1"
        />
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
