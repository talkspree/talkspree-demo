import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Sparkles } from 'lucide-react';

const TEXT = 'Contacts';

interface ExpandableContactsButtonProps {
  unseenCount?: number;
}

export function ExpandableContactsButton({ unseenCount = 0 }: ExpandableContactsButtonProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-end cursor-pointer group"
      style={{ height: 96 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate('/contacts')}
    >
      <motion.button
        className="relative flex items-center bg-gradient-to-br from-[#A95EFA] to-[#4C81F6] border border-white/20 border-r-0 shadow-xl shadow-[#A95EFA]/30 overflow-hidden"
        style={{
          borderTopLeftRadius: '32px',
          borderBottomLeftRadius: '32px',
        }}
        initial={false}
        animate={{
          width: isHovered ? 170 : 55,
          height: isHovered ? 64 : 96,
          paddingLeft: isHovered ? 24 : 14,
        }}
        transition={{
          type: 'spring',
          stiffness: 350,
          damping: 25,
          mass: 0.8,
        }}
        whileTap={{ scale: 0.96, originX: 1 }}
      >
        {/* Hover brightness overlay */}
        <motion.div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Inner glow */}
        <motion.div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.4)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-l-[32px]" />

        <div className="relative z-10 flex items-center">
          <motion.div
            animate={{
              rotate: isHovered ? [0, -15, 15, 0] : 0,
              color: '#ffffff',
              scale: isHovered ? 1 : 1
            }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="flex-shrink-0 relative"
          >
            <Users size={30} strokeWidth={2} />

            {/* Notification badge */}
            <AnimatePresence>
              {unseenCount > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1.5 -right-2.5 flex items-center justify-center h-3 w-3"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Animated text */}
          <div className="ml-3 flex overflow-hidden">
            <AnimatePresence>
              {isHovered &&
                TEXT.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)', scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(4px)', scale: 0.8 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                      delay: i * 0.02,
                    }}
                    className="inline-block font-semibold tracking-wide text-white"
                  >
                    {char}
                  </motion.span>
                ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Sparkle particles */}
        <AnimatePresence>
          {isHovered && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: -20, y: -15 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                className="absolute top-1/2 right-4 text-white pointer-events-none"
              >
                <Sparkles size={10} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], x: -10, y: 15 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                className="absolute top-1/2 right-8 text-white/80 pointer-events-none"
              >
                <Sparkles size={8} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
