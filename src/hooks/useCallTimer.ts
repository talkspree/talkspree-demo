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
  // Mirror showExtendPrompt so the interval can read it without being a dependency
  // (otherwise the interval tears down and rebuilds on every tick / prompt change).
  const showExtendPromptRef = useRef(false);

  // Calculate initial time remaining based on start time
  useEffect(() => {
    if (startedAt) {
      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remaining = totalDurationSeconds + extendedTimeRef.current - elapsedSeconds;
      setTimeRemaining(Math.max(0, remaining));
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

          // Show extend prompt at 2 minutes (once)
          if (newTime === 120 && !showExtendPromptRef.current) {
            showExtendPromptRef.current = true;
            setShowExtendPrompt(true);
          }

          if (newTime <= 0) {
            setIsRunning(false);
          }
        } else {
          // Fallback: simple countdown if no start time available
          setTimeRemaining(prev => {
            const newTime = prev - 1;

            if (newTime === 120 && !showExtendPromptRef.current) {
              showExtendPromptRef.current = true;
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
    // Note: timeRemaining and showExtendPrompt are intentionally NOT deps — the
    // interval reads them via refs / functional updates and self-stops at 0 via
    // setIsRunning(false), so it only needs to be created once per run.
  }, [isRunning, startedAt, totalDurationSeconds]);

  const extendCall = (additionalMinutes: number = 10) => {
    const additionalSeconds = additionalMinutes * 60;
    extendedTimeRef.current += additionalSeconds;
    setTimeRemaining(prev => prev + additionalSeconds);
    showExtendPromptRef.current = false;
    setShowExtendPrompt(false);
  };

  const declineExtend = () => {
    showExtendPromptRef.current = false;
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
