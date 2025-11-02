import { useState, useEffect, useRef } from 'react';

export function useCallTimer(initialDuration: number = 15 * 60) { // 15 minutes default
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(true);
  const [showExtendPrompt, setShowExtendPrompt] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Show extend prompt at 2 minutes
          if (newTime === 120) {
            setShowExtendPrompt(true);
          }
          
          if (newTime <= 0) {
            setIsRunning(false);
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  const extendCall = (additionalMinutes: number = 10) => {
    setTimeRemaining(prev => prev + (additionalMinutes * 60));
    setShowExtendPrompt(false);
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
