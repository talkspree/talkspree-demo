/**
 * Agora Call Hook - resilient join/leave and remote hangup handling
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { AgoraService } from '@/lib/agora/client';
import { getAgoraToken, updateCallWithAgoraInfo, sendCallSignal, subscribeToCallSignals } from '@/lib/api/agora';
import { supabase } from '@/lib/supabase';

export interface UseAgoraCallOptions {
  callId: string;
  onRemoteUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onReconnecting?: () => void;
  onReconnectFailed?: () => void;
  onRemoteUserRejoined?: (user: IAgoraRTCRemoteUser) => void;
  onConnectionStateChange?: (state: string) => void;
  onRemoteHangup?: () => void;
}

export interface UseAgoraCallReturn {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  isCameraOn: boolean;
  isMicOn: boolean;
  localVideoTrack: any;
  remoteUsers: IAgoraRTCRemoteUser[];
  joinCall: () => Promise<void>;
  leaveCall: (skipSignal?: boolean) => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
  switchCamera: () => Promise<void>;
  agoraService: AgoraService | null;
}

export function useAgoraCall(options: UseAgoraCallOptions): UseAgoraCallReturn {
  const { callId, onRemoteUserJoined, onRemoteUserLeft, onConnectionStateChange, onRemoteHangup } = options;

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);

  const agoraServiceRef = useRef<AgoraService | null>(null);
  const signalChannelRef = useRef<any>(null);
  const hasJoinedRef = useRef(false);
  const leavingRef = useRef(false);

  const callbacksRef = useRef<UseAgoraCallOptions>({
    callId,
    onRemoteUserJoined,
    onRemoteUserLeft,
    onConnectionStateChange,
    onRemoteHangup,
  });

  useEffect(() => {
    callbacksRef.current = {
      callId,
      onRemoteUserJoined,
      onRemoteUserLeft,
      onConnectionStateChange,
      onRemoteHangup,
    };
  }, [callId, onConnectionStateChange, onRemoteHangup, onRemoteUserJoined, onRemoteUserLeft]);

  // Initialize Agora service once
  useEffect(() => {
    if (!agoraServiceRef.current) {
      agoraServiceRef.current = new AgoraService();
    }

    const service = agoraServiceRef.current;

    service.on('user-joined', (user) => {
      setRemoteUsers((prev) => {
        const exists = prev.find((u) => u.uid === user.uid);
        if (exists) return prev;
        return [...prev, user];
      });
      callbacksRef.current.onRemoteUserJoined?.(user);
    });

    service.on('user-left', async (user) => {
      console.log('⚠️ Remote user left event fired for:', user.uid);
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));

      // Phase 1: Show "Reconnecting..." animation
      callbacksRef.current.onReconnecting?.();

      // Wait 5 seconds with reconnecting animation
      setTimeout(() => {
        const currentRemoteUsers = agoraServiceRef.current?.getRemoteUsers();
        if (!currentRemoteUsers || currentRemoteUsers.size === 0) {
          console.log('⚠️ Still disconnected after 5s - showing end call modal');
          // Phase 2: Show "Call Ended" modal with 5-second countdown
          callbacksRef.current.onReconnectFailed?.();

          // Wait another 5 seconds (10 seconds total)
          setTimeout(() => {
            const finalCheck = agoraServiceRef.current?.getRemoteUsers();
            if (!finalCheck || finalCheck.size === 0) {
              console.log('❌ Remote user did not rejoin - ending call');
              leaveCall(true);
              callbacksRef.current.onRemoteHangup?.();
            } else {
              console.log('✅ Remote user rejoined during countdown');
              callbacksRef.current.onRemoteUserRejoined?.(user);
            }
          }, 5000);
        } else {
          console.log('✅ Remote user rejoined during reconnect phase');
          callbacksRef.current.onRemoteUserRejoined?.(user);
        }
      }, 5000);
    });

    service.on('user-published', (user, mediaType) => {
      setRemoteUsers((prev) => {
        const exists = prev.find((u) => u.uid === user.uid);
        if (exists) {
          return prev.map((u) => (u.uid === user.uid ? user : u));
        }
        return [...prev, user];
      });
    });

    service.on('connection-state-change', (curState) => {
      if (curState === 'CONNECTED') {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (curState === 'DISCONNECTED') {
        setIsConnected(false);
        setIsConnecting(false);
      } else if (curState === 'CONNECTING') {
        setIsConnecting(true);
      }
      callbacksRef.current.onConnectionStateChange?.(curState);
    });

    return () => {
      if (hasJoinedRef.current) {
        leaveCall(true).catch(console.error);
      }
      if (signalChannelRef.current) {
        try {
          signalChannelRef.current.unsubscribe();
        } catch (e) {
          console.warn('Error unsubscribing on unmount:', e);
        }
        signalChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinCall = useCallback(async () => {
    if (!agoraServiceRef.current || hasJoinedRef.current || isConnecting || leavingRef.current) {
      return;
    }

    try {
      hasJoinedRef.current = true;
      leavingRef.current = false;
      setIsConnecting(true);
      setError(null);

      const { token, channelName, uid } = await getAgoraToken(callId);
      await updateCallWithAgoraInfo(callId, channelName, uid);
      await agoraServiceRef.current.join(channelName, token || null, uid);

      setLocalVideoTrack(agoraServiceRef.current.getLocalVideoTrack());

      await sendCallSignal(callId, 'agora_join', { channelName, uid }, 'connected');

      signalChannelRef.current = subscribeToCallSignals(callId, async (signal) => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        if (signal.signal_type === 'agora_leave' && signal.user_id !== currentUser.id) {
          await leaveCall(true);
          callbacksRef.current.onRemoteHangup?.();

          const currentRemoteUsers = agoraServiceRef.current?.getRemoteUsers();
          const remoteUser =
            currentRemoteUsers && currentRemoteUsers.size > 0
              ? Array.from(currentRemoteUsers.values())[0]
              : { uid: signal.user_id } as any;
          callbacksRef.current.onRemoteUserLeft?.(remoteUser);
        }
      });

      setIsConnected(true);
      setIsConnecting(false);
    } catch (err: any) {
      setError(err.message || 'Failed to join call');
      setIsConnecting(false);
      setIsConnected(false);
      hasJoinedRef.current = false;
    }
  }, [callId, isConnecting]);

  const leaveCall = useCallback(
    async (skipSignal = false) => {
      if (!hasJoinedRef.current && !leavingRef.current) {
        return;
      }

      try {
        leavingRef.current = true;

        if (!skipSignal && callId) {
          try {
            await sendCallSignal(callId, 'agora_leave', {}, 'ended');
          } catch (signalError) {
            console.warn('Failed to send leave signal:', signalError);
          }
        }

        if (agoraServiceRef.current) {
          try {
            await agoraServiceRef.current.leave();
          } catch (leaveError) {
            console.warn('Error leaving Agora channel:', leaveError);
          }
        }

        hasJoinedRef.current = false;

        if (signalChannelRef.current) {
          try {
            signalChannelRef.current.unsubscribe();
          } catch (unsubError) {
            console.warn('Error unsubscribing from signals:', unsubError);
          }
          signalChannelRef.current = null;
        }

        setIsConnected(false);
        setRemoteUsers([]);
        setLocalVideoTrack(null);
      } catch (err: any) {
        console.error('Failed to leave call:', err);
        hasJoinedRef.current = false;
        setIsConnected(false);
        setRemoteUsers([]);
        setLocalVideoTrack(null);
      }
    },
    [callId]
  );

  const toggleCamera = useCallback(async () => {
    if (!agoraServiceRef.current) return;

    try {
      const newState = await agoraServiceRef.current.toggleCamera();
      setIsCameraOn(newState);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle camera');
    }
  }, []);

  const toggleMic = useCallback(async () => {
    if (!agoraServiceRef.current) return;

    try {
      const newState = await agoraServiceRef.current.toggleMic();
      setIsMicOn(newState);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle mic');
    }
  }, []);

  const switchCamera = useCallback(async () => {
    if (!agoraServiceRef.current) return;

    try {
      await agoraServiceRef.current.switchCamera();
    } catch (err: any) {
      setError(err.message || 'Failed to switch camera');
    }
  }, []);

  return {
    isConnecting,
    isConnected,
    error,
    isCameraOn,
    isMicOn,
    localVideoTrack,
    remoteUsers,
    joinCall,
    leaveCall,
    toggleCamera,
    toggleMic,
    switchCamera,
    agoraService: agoraServiceRef.current,
  };
}

