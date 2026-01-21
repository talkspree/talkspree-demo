/**
 * Call Heartbeat Hook
 * Sends periodic heartbeats to the server to indicate the user is still in the call
 * This allows the server to detect disconnected/crashed users and clean up stale calls
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const HEARTBEAT_INTERVAL = 10000; // Send heartbeat every 10 seconds

export function useCallHeartbeat(callId?: string, isActive = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!callId || !isActive) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const { error } = await supabase.rpc('update_call_heartbeat', {
          p_call_id: callId,
        });

        if (error) {
          console.warn('⚠️ Failed to send heartbeat:', error);
        } else {
          console.log('💓 Heartbeat sent for call:', callId);
        }
      } catch (error) {
        console.error('❌ Heartbeat error:', error);
      }
    };

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Set up interval to send periodic heartbeats
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [callId, isActive]);
}
