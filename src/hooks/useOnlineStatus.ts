import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to manage user online status
 * Sets user online when logged in and page is visible
 * Sets user offline on logout, page close, or after inactivity
 */
export function useOnlineStatus(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let heartbeatInterval: NodeJS.Timeout;

    const setOnline = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            is_online: true,
            last_seen_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (error) {
          console.error('Failed to set online status:', error);
        } else {
          console.log('✅ Set user online');
        }
      } catch (error) {
        console.error('Failed to set online status:', error);
      }
    };

    const setOffline = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            is_online: false,
            last_seen_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (error) {
          console.error('Failed to set offline status:', error);
        } else {
          console.log('👋 Set user offline');
        }
      } catch (error) {
        console.error('Failed to set offline status:', error);
      }
    };

    // Set online when component mounts
    setOnline();

    // Send heartbeat every 30 seconds to keep status updated
    heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setOnline();
      }
    }, 30000);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline();
      } else {
        setOffline();
      }
    };

    // Handle page unload (browser close, navigation away)
    const handleBeforeUnload = () => {
      // Call setOffline synchronously (best effort)
      // Note: This may not always complete before page unload
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, [userId]);
}

