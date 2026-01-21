import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface CallExtensionState {
  // My extension request status
  iRequested: boolean;
  // Other user's extension request status
  theyRequested: boolean;
  // Both users agreed to extend
  bothAgreed: boolean;
  // Extension has been applied
  extended: boolean;
}

/**
 * Hook to manage call extension requests requiring both users' agreement
 */
export function useCallExtension(callId: string | undefined, onExtend: (minutes: number) => void) {
  const [state, setState] = useState<CallExtensionState>({
    iRequested: false,
    theyRequested: false,
    bothAgreed: false,
    extended: false,
  });
  const myUserIdRef = useRef<string | null>(null);
  const extensionMinutes = 10; // Default extension duration

  // Get current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      myUserIdRef.current = user?.id || null;
    };
    fetchUserId();
  }, []);

  // Request to extend the call
  const requestExtension = useCallback(async () => {
    if (!callId || !myUserIdRef.current) return;

    setState(prev => ({ ...prev, iRequested: true }));

    // Broadcast extension request signal
    const { error } = await supabase
      .from('call_signals')
      .insert({
        call_id: callId,
        user_id: myUserIdRef.current,
        signal_type: 'extension_request',
        sender_id: myUserIdRef.current,
        signal_data: { minutes: extensionMinutes },
      });

    if (error) {
      console.error('Failed to send extension request:', error);
      setState(prev => ({ ...prev, iRequested: false }));
    } else {
      console.log(`📣 Extension request sent (${extensionMinutes} minutes)`);

      // Update call_history to track who requested
      await supabase
        .from('call_history')
        .update({
          extend_requested_by: myUserIdRef.current,
          extend_request_time: new Date().toISOString(),
        })
        .eq('id', callId);
    }
  }, [callId, extensionMinutes]);

  // Approve the other user's extension request
  const approveExtension = useCallback(async () => {
    if (!callId || !myUserIdRef.current || !state.theyRequested) return;

    // Broadcast extension approval signal
    const { error } = await supabase
      .from('call_signals')
      .insert({
        call_id: callId,
        user_id: myUserIdRef.current,
        signal_type: 'extension_approved',
        sender_id: myUserIdRef.current,
        signal_data: { minutes: extensionMinutes },
      });

    if (error) {
      console.error('Failed to send extension approval:', error);
    } else {
      console.log(`✅ Extension approved (${extensionMinutes} minutes)`);
      setState(prev => ({ ...prev, bothAgreed: true }));

      // Apply the extension
      onExtend(extensionMinutes);

      // Update call_history to track who approved
      const { data: callData } = await supabase
        .from('call_history')
        .select('extensions_count')
        .eq('id', callId)
        .single();

      await supabase
        .from('call_history')
        .update({
          extend_approved_by: myUserIdRef.current,
          extend_approved_time: new Date().toISOString(),
          extensions_count: (callData?.extensions_count || 0) + 1,
        })
        .eq('id', callId);

      setState(prev => ({ ...prev, extended: true }));
    }
  }, [callId, state.theyRequested, extensionMinutes, onExtend]);

  // Decline extension request
  const declineExtension = useCallback(async () => {
    if (!callId || !myUserIdRef.current) return;

    setState(prev => ({
      ...prev,
      iRequested: false,
      theyRequested: false,
      bothAgreed: false,
    }));

    // Broadcast extension declined signal
    await supabase
      .from('call_signals')
      .insert({
        call_id: callId,
        user_id: myUserIdRef.current,
        signal_type: 'extension_declined',
        sender_id: myUserIdRef.current,
        signal_data: {},
      });

    console.log('❌ Extension declined');
  }, [callId]);

  // Subscribe to extension signals
  useEffect(() => {
    if (!callId) return;

    const channel = supabase
      .channel(`call_extensions_${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `call_id=eq.${callId}`,
        },
        (payload: any) => {
          const signal = payload.new;
          const isFromMe = signal.sender_id === myUserIdRef.current;

          console.log('📨 Extension signal received:', signal.signal_type, 'from:', isFromMe ? 'me' : 'them');

          switch (signal.signal_type) {
            case 'extension_request':
              if (!isFromMe) {
                // Other user requested extension
                setState(prev => ({ ...prev, theyRequested: true }));
                console.log('🔔 Other user wants to extend the call');
              }
              break;

            case 'extension_approved':
              if (!isFromMe) {
                // Other user approved our request
                setState(prev => ({ ...prev, bothAgreed: true }));
                console.log('🎉 Other user approved extension');

                // Apply the extension
                const minutes = signal.signal_data?.minutes || extensionMinutes;
                onExtend(minutes);
                setState(prev => ({ ...prev, extended: true }));
              }
              break;

            case 'extension_declined':
              if (!isFromMe) {
                // Other user declined
                setState(prev => ({
                  ...prev,
                  iRequested: false,
                  theyRequested: false,
                  bothAgreed: false,
                }));
                console.log('😞 Other user declined extension');
              }
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, extensionMinutes, onExtend]);

  return {
    ...state,
    requestExtension,
    approveExtension,
    declineExtension,
  };
}
