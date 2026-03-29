import { AnimatePresence } from 'framer-motion';
import { ChatWindow } from './ChatWindow';
import { ChatBubbleContainer } from './ChatBubbleContainer';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

/**
 * Global chat manager component that renders floating chat bubbles
 * and open chat windows. Should be placed at the app root level.
 * 
 * Chat UI is hidden during calls and on auth pages.
 */
export function ChatManager() {
  const { user } = useAuth();
  const { openChats, activeBubbles } = useChat();
  const location = useLocation();

  // Hide chat UI on certain pages
  const hiddenRoutes = ['/auth', '/call', '/waiting', '/countdown', '/onboarding', '/clear-session'];
  const shouldHide = !user || hiddenRoutes.some((r) => location.pathname.startsWith(r));

  if (shouldHide) return null;

  // Get bubble data for open chats
  const openChatBubbles = openChats
    .map((id) => activeBubbles.find((b) => b.contactUserId === id))
    .filter(Boolean) as typeof activeBubbles;

  return (
    <>
      {/* Chat Windows - positioned to the left of the bubbles */}
      <div className="fixed bottom-0 left-0 right-[72px] flex items-end justify-end gap-3 p-3 pointer-events-none z-[60]">
        <AnimatePresence>
          {openChatBubbles.map((bubble) => (
            <div key={bubble.contactUserId} className="pointer-events-auto shrink-0">
              <ChatWindow contact={bubble} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Bubbles */}
      <ChatBubbleContainer />
    </>
  );
}
