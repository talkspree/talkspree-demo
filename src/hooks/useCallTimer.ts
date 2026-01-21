import { useState, useEffect, useRef } from 'react';

export function useCallTimer(
  totalDurationSeconds: number = 15 * 60,
  startedAt: string | null = null
) {
  const [timeRemaining, setTimeRemaining] = useState(totalDurationSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [showExtendPrompt, setShowExtendPrompt] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const extendedTimeRef = useRef(0); // Track manual extensions

  // Calculate initial time remaining based on start time
  useEffect(() => {
    if (startedAt) {
      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remaining = totalDurationSeconds + extendedTimeRef.current - elapsedSeconds;
      setTimeRemaining(Math.max(0, remaining));
      console.log(`⏱️ Timer initialized: ${Math.max(0, remaining)}s remaining (started ${elapsedSeconds}s ago)`);
    }
  }, [startedAt, totalDurationSeconds]);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        if (startedAt) {
          // Recalculate from database timestamp to stay in sync
          const startTime = new Date(startedAt).getTime();
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          const remaining = totalDurationSeconds + extendedTimeRef.current - elapsedSeconds;
          const newTime = Math.max(0, remaining);

          setTimeRemaining(newTime);

          // Show extend prompt at 2 minutes
          if (newTime === 120 && !showExtendPrompt) {
            setShowExtendPrompt(true);
          }

          if (newTime <= 0) {
            setIsRunning(false);
          }
        } else {
          // Fallback: simple countdown if no start time available
          setTimeRemaining(prev => {
            const newTime = prev - 1;

            if (newTime === 120) {
              setShowExtendPrompt(true);
            }

            if (newTime <= 0) {
              setIsRunning(false);
              return 0;
            }

            return newTime;
          });
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining, startedAt, totalDurationSeconds, showExtendPrompt]);

  const extendCall = (additionalMinutes: number = 10) => {
    const additionalSeconds = additionalMinutes * 60;
    extendedTimeRef.current += additionalSeconds;
    setTimeRemaining(prev => prev + additionalSeconds);
    setShowExtendPrompt(false);
    console.log(`⏱️ Call extended by ${additionalMinutes} minutes`);
  };

  const declineExtend = () => {
    setShowExtendPrompt(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    setIsRunning(false);
    setTimeRemaining(0);
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    showExtendPrompt,
    extendCall,
    declineExtend,
    endCall,
    isCallEnded: timeRemaining === 0
  };
}
