import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 px-3 py-2 bg-muted rounded-2xl rounded-bl-none w-fit">
      {[0, 1, 2].map((dot) => (
        <motion.div
          key={dot}
          className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: dot * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
