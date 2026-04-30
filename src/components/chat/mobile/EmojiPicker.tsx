import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Emoji data ───────────────────────────────────────────────────────────────
// Curated selection of the most commonly used emoji in chat apps, grouped by
// category. Keeping this in-tree avoids an extra dependency.

const EMOJI_CATEGORIES: { label: string; emoji: string[] }[] = [
  {
    label: 'Smileys',
    emoji: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊',
      '😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋',
      '😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫠',
      '😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔',
      '😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶',
    ],
  },
  {
    label: 'Gestures',
    emoji: [
      '👍','👎','👌','🤌','✌️','🤞','🖐','🙌','👏','🤝',
      '🙏','✊','👊','🤜','🤛','💪','🦾','🫶','❤️‍🔥','💯',
    ],
  },
  {
    label: 'Hearts',
    emoji: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','♥️',
    ],
  },
  {
    label: 'People',
    emoji: [
      '😈','👿','💀','☠️','💩','🤡','👻','👽','👾','🤖',
      '😺','😸','😹','😻','😼','😽','🙀','😿','😾',
    ],
  },
  {
    label: 'Objects',
    emoji: [
      '🎉','🎊','🎈','🎁','🏆','🥇','🎯','🎮','🎲','🧩',
      '🔥','💥','✨','⭐','🌟','💫','☀️','🌈','🌙','⚡',
      '💬','💭','📱','💻','🎵','🎶','📷','🍕','🍔','🍣',
      '🍦','🍩','☕','🧃','🍺','🥂','🎸','⚽','🏀','🎤',
    ],
  },
];

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ open, onClose, onSelect }: EmojiPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when tapping outside the panel
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture so it fires before other handlers
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          key="emoji-picker"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          // Anchor it above the footer — absolute positioning inside the relative
          // wrapper created in MobileMessengerChat.
          className="absolute bottom-full left-0 right-0 z-30 mx-3 mb-2 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
          style={{ maxHeight: '260px' }}
        >
          <div className="overflow-y-auto hide-scrollbar" style={{ maxHeight: '260px' }}>
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label} className="px-3 pt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {cat.label}
                </p>
                <div className="flex flex-wrap gap-0">
                  {cat.emoji.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        onSelect(em);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors active:bg-gray-100 hover:bg-gray-100"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="h-3" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
