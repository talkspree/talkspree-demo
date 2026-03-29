import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface UserLeftModalProps {
  open: boolean;
  userName: string;
  onCountdownComplete: () => void;
}

export function UserLeftModal({ open, userName, onCountdownComplete }: UserLeftModalProps) {
  const [progress, setProgress] = useState(0);
  const callbackRef = useRef(onCountdownComplete);
  callbackRef.current = onCountdownComplete;

  useEffect(() => {
    if (!open) {
      setProgress(0);
      return;
    }

    let startTime: number;
    let animationFrame: number;
    const duration = 5000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(currentProgress);

      if (currentProgress < 100) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setTimeout(() => callbackRef.current(), 150);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [open]);

  const radius = 48.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
              className="relative flex items-center justify-center w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] rounded-full bg-white shadow-2xl"
            >
              {/* SVG progress ring */}
              <svg
                className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                viewBox="0 0 100 100"
              >
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="1.5" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>

              <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8 sm:p-12 text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Call Ended</h2>
                <p className="text-gray-500 mb-6">
                  <span className="font-medium text-gray-900">{userName}</span> has left the call.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting...
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
