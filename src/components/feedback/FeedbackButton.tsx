import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bug } from 'lucide-react';
import { useDevice } from '@/hooks/useDevice';
import { FeedbackModal } from './FeedbackModal';
import { consumeFeedbackTooltipFlag } from './feedbackTooltipFlag';

const AUTO_SHOW_MS = 4200;

interface FeedbackButtonProps {
  /** Optional className applied to the wrapping div for layout positioning. */
  className?: string;
}

export function FeedbackButton({ className = '' }: FeedbackButtonProps) {
  const device = useDevice();
  const isDesktop = device === 'desktop';

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [isWobbling, setIsWobbling] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const autoTimerRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Auto-show ONCE per login on desktop.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isDesktop) return;
    if (!consumeFeedbackTooltipFlag()) return;

    setTooltipVisible(true);
    autoTimerRef.current = window.setTimeout(() => {
      setTooltipVisible(false);
      autoTimerRef.current = null;
    }, AUTO_SHOW_MS);

    return () => {
      if (autoTimerRef.current !== null) {
        window.clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [isDesktop]);

  // ---------------------------------------------------------------------------
  // Hover — show tooltip and kick off CSS wobble animation.
  // ---------------------------------------------------------------------------
  const handleMouseEnter = () => {
    if (!isDesktop) return;
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setTooltipVisible(true);
    // Remove then re-add the class so repeated hovers always replay the animation.
    setIsWobbling(false);
    requestAnimationFrame(() => setIsWobbling(true));
  };

  const handleMouseLeave = () => {
    if (!isDesktop) return;
    setTooltipVisible(false);
  };

  return (
    <>
      <div
        className={`relative flex items-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <AnimatePresence>
          {tooltipVisible && isDesktop && (
            <div className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none drop-shadow-xl flex items-center origin-right">
              <motion.div
                initial={{ opacity: 0, x: 6, scale: 0.93 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 6, scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 280, damping: 25 }}
                className="feedback-tooltip-float relative"
              >
                <div className="relative overflow-hidden bg-gradient-to-br from-[#A95EFA] to-[#4C81F6] text-white text-[13px] font-medium px-4 py-2.5 rounded-xl whitespace-nowrap flex items-center shadow-[0_8px_32px_rgba(169,94,250,0.4),inset_0_0_0_0.5px_rgba(255,255,255,0.2)] tracking-wide">
                  <div className="feedback-tooltip-shimmer absolute inset-0 rounded-xl" />
                  <span className="relative z-10 tracking-tight">
                    ✦ Found a bug? Let us know
                  </span>
                </div>
                {/* Pointer arrow matching the right-edge colour of the gradient */}
                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[7px] border-y-transparent border-l-[8px] border-l-[#4C81F6]" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Button styled like the non-admin role pill (neu-concave) */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          onAnimationEnd={() => setIsWobbling(false)}
          className={[
            'relative flex items-center justify-center w-10 h-10 rounded-full',
            'bg-background text-foreground neu-concave hover:neu-concave-pressed',
            'cursor-pointer active:scale-95 transition-shadow focus:outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring origin-center',
            isWobbling ? 'bug-wobble' : '',
          ].join(' ')}
          aria-label="Report a bug or give feedback"
        >
          <Bug className="w-[18px] h-[18px]" />
        </button>
      </div>

      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
