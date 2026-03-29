import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ReconnectingOverlayProps {
  show: boolean;
  userName: string;
}

export function ReconnectingOverlay({ show, userName }: ReconnectingOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
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
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mb-4 shrink-0">
                  <Loader2 className="h-7 w-7 text-blue-600 animate-spin" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Reconnecting...</h3>
                <p className="text-sm text-gray-500 mb-2">
                  <span className="font-medium text-gray-900">{userName || 'Your partner'}</span>'s connection was lost.
                </p>
                <p className="text-sm text-gray-400">Waiting for them to rejoin...</p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
