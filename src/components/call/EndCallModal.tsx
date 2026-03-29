import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff } from 'lucide-react';

interface EndCallModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndCallModal({ open, onConfirm, onCancel }: EndCallModalProps) {
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
              <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8 sm:p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4 shrink-0">
                  <PhoneOff className="h-7 w-7 text-red-600" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">End Call?</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to end this call? This action cannot be undone.
                </p>
                <div className="flex gap-3 w-full justify-center">
                  <button
                    onClick={onCancel}
                    className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 shadow-sm shadow-red-600/20"
                  >
                    End Call
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
