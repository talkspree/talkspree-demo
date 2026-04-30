import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/contexts/ChatContext';
import { MobileMessengerInbox } from './MobileMessengerInbox';
import { MobileMessengerChat } from './MobileMessengerChat';

/**
 * Full-screen mobile messenger overlay.
 *
 * The inbox is ALWAYS rendered as the base layer so the back button in the
 * chat view always returns the user to the contact list, regardless of how
 * the messenger was opened.
 *
 * Opening modes (driven by `mobileOpenedDirect` in ChatContext):
 *
 *   FAB button  → inbox-first: inbox visible, then contact tap triggers the
 *                 iOS-style push (inbox scales back, chat slides from right).
 *
 *   External    → direct-to-chat: inbox renders silently underneath; the
 *                 chat appears with a subtle fade + slight rise animation.
 *                 Back → inbox, then ← on inbox → closes messenger.
 */
export function MobileMessenger() {
  const {
    isMobileMessengerOpen,
    mobileActiveChat,
    mobileOpenedDirect,
    closeMobileMessenger,
    openMobileChat,
    closeMobileChat,
  } = useChat();

  // Lock body scroll while the messenger is open
  useEffect(() => {
    if (!isMobileMessengerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isMobileMessengerOpen]);

  // Whether the inbox should visually push back when a chat is open.
  // In direct mode the inbox stays static underneath – no distracting animation.
  const pushInbox = !mobileOpenedDirect && !!mobileActiveChat;

  return (
    <AnimatePresence>
      {isMobileMessengerOpen && (
        <motion.div
          key="mobile-messenger"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          className="fixed inset-0 z-[100] bg-white"
        >
          <div className="relative h-full w-full overflow-hidden bg-white">

            {/* ── Base layer: inbox (always rendered) ── */}
            <motion.div
              animate={
                pushInbox
                  ? { x: '-25%', scale: 0.95, opacity: 0.4 }
                  : { x: '0%', scale: 1, opacity: 1 }
              }
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="absolute inset-0 z-10 flex flex-col bg-white"
            >
              <MobileMessengerInbox
                onClose={closeMobileMessenger}
                onOpenConversation={openMobileChat}
              />
            </motion.div>

            {/* ── Top layer: active conversation ── */}
            <AnimatePresence initial={false}>
              {mobileActiveChat && (
                <motion.div
                  key={`chat-${mobileActiveChat.contactUserId}`}
                  // Direct mode: gentle fade + 20 px rise from below (subtle)
                  // Inbox-first mode: full horizontal slide from the right
                  initial={
                    mobileOpenedDirect
                      ? { opacity: 0, y: 20 }
                      : { x: '100%' }
                  }
                  animate={
                    mobileOpenedDirect
                      ? { opacity: 1, y: 0 }
                      : { x: '0%' }
                  }
                  exit={
                    mobileOpenedDirect
                      ? { opacity: 0, y: 20 }
                      : { x: '100%' }
                  }
                  transition={
                    mobileOpenedDirect
                      ? { duration: 0.22, ease: 'easeOut' }
                      : { type: 'spring', damping: 26, stiffness: 260 }
                  }
                  className="absolute inset-0 z-20 flex flex-col bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.07)]"
                >
                  <MobileMessengerChat
                    contact={mobileActiveChat}
                    onBack={closeMobileChat}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
