import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentCall } from '@/lib/api/calls';

/**
 * Detects if user has an ongoing call and restores it after page refresh
 */
export function useCallRestoration() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [hasOngoingCall, setHasOngoingCall] = useState(false);

  useEffect(() => {
    const checkForOngoingCall = async () => {
      try {
        const call = await getCurrentCall();

        if (call) {
          console.log('🔄 Found ongoing call after page load, restoring...', call.id);
          setHasOngoingCall(true);

          // Restore call state and navigate to call page
          navigate('/call', {
            replace: true,
            state: {
              callId: call.id,
              matchedUser: call.caller,
              duration: 15, // Default duration
            },
          });
        }
      } catch (error) {
        console.error('Error checking for ongoing call:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkForOngoingCall();
  }, [navigate]);

  return { isChecking, hasOngoingCall };
}
