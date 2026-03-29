/**
 * Agora Call Hook - resilient join/leave and remote hangup handling.
 *
 * Key design: every (re)mount gets its own AgoraService instance.
 * joinCall captures the instance at start and does an *identity check*
 * after every async gap so a Strict-Mode-orphaned join self-cleans.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { AgoraService } from '@/lib/agora/client';
import { getAgoraToken, updateCallWithAgoraInfo, sendCallSignal, subscribeToCallSignals } from '@/lib/api/agora';
import { supabase } from '@/lib/supabase';

export interface UseAgoraCallOptions {
  callId: string;
  onRemoteUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onConnectionStateChange?: (state: string) => void;
  onRemoteHangup?: () => void;
  onRemoteDisconnect?: () => void;
  onRemoteReconnected?: () => void;
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
  const { callId } = options;

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
  const remoteDisconnectedRef = useRef(false);
  const userLeftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  });

  // ── Service lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    const service = new AgoraService();
    agoraServiceRef.current = service;
    hasJoinedRef.current = false;
    leavingRef.current = false;
    remoteDisconnectedRef.current = false;

    service.on('user-joined', (user) => {
      const wasDisconnected = remoteDisconnectedRef.current;
      remoteDisconnectedRef.current = false;

      setRemoteUsers((prev) => {
        const exists = prev.find((u) => u.uid === user.uid);
        return exists ? prev : [...prev, user];
      });

      if (wasDisconnected) {
        callbacksRef.current.onRemoteReconnected?.();
      } else {
        callbacksRef.current.onRemoteUserJoined?.(user);
      }
    });

    service.on('user-left', (user) => {
      console.log('[Agora] Remote user left:', user.uid);
      remoteDisconnectedRef.current = true;
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));

      if (userLeftTimerRef.current) clearTimeout(userLeftTimerRef.current);
      userLeftTimerRef.current = setTimeout(() => {
        userLeftTimerRef.current = null;
        if (remoteDisconnectedRef.current) {
          callbacksRef.current.onRemoteDisconnect?.();
        }
      }, 400);
    });

    service.on('user-published', (user, _mediaType) => {
      setRemoteUsers((prev) => {
        const exists = prev.find((u) => u.uid === user.uid);
        if (exists) return prev.map((u) => (u.uid === user.uid ? user : u));
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
      if (userLeftTimerRef.current) {
        clearTimeout(userLeftTimerRef.current);
        userLeftTimerRef.current = null;
      }

      // Null the ref IMMEDIATELY — this is the identity signal that tells
      // any in-flight joinCall on THIS service to abort and self-clean.
      agoraServiceRef.current = null;
      hasJoinedRef.current = false;
      leavingRef.current = false;

      service.leave().catch((e) => console.warn('[Agora] leave on unmount:', e));

      if (signalChannelRef.current) {
        try { signalChannelRef.current.unsubscribe(); } catch { /* no-op */ }
        signalChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Join ───────────────────────────────────────────────────────────────
  const joinCall = useCallback(async () => {
    const service = agoraServiceRef.current;
    if (!service || hasJoinedRef.current || isConnecting) return;

    // Helper: returns true if this service was superseded (cleanup ran).
    // When that happens, we clean up whatever this orphaned join created.
    const isStale = () => agoraServiceRef.current !== service;

    try {
      hasJoinedRef.current = true;
      leavingRef.current = false;
      setIsConnecting(true);
      setError(null);

      const { token, channelName, uid } = await getAgoraToken(callId);

      if (isStale()) {
        console.warn('[Agora] joinCall aborted after getAgoraToken (service replaced)');
        service.leave().catch(() => {});
        return;
      }

      await updateCallWithAgoraInfo(callId, channelName, uid);

      if (isStale()) {
        console.warn('[Agora] joinCall aborted after updateCallWithAgoraInfo (service replaced)');
        service.leave().catch(() => {});
        return;
      }

      await service.join(channelName, token || null, uid);

      if (isStale()) {
        console.warn('[Agora] joinCall aborted after service.join (service replaced) — leaving orphan channel');
        service.leave().catch(() => {});
        return;
      }

      setLocalVideoTrack(service.getLocalVideoTrack());

      await sendCallSignal(callId, 'agora_join', { channelName, uid }, 'connected');

      if (isStale()) {
        console.warn('[Agora] joinCall aborted after sendCallSignal (service replaced)');
        service.leave().catch(() => {});
        return;
      }

      signalChannelRef.current = subscribeToCallSignals(callId, async (signal) => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        if (signal.signal_type === 'agora_leave' && signal.user_id !== currentUser.id) {
          if (userLeftTimerRef.current) {
            clearTimeout(userLeftTimerRef.current);
            userLeftTimerRef.current = null;
          }
          remoteDisconnectedRef.current = false;
          callbacksRef.current.onRemoteHangup?.();
        }
      });

      setIsConnected(true);
      setIsConnecting(false);
    } catch (err: any) {
      // If this service was superseded during an error, clean it up silently
      if (isStale()) {
        service.leave().catch(() => {});
        return;
      }
      setError(err.message || 'Failed to join call');
      setIsConnecting(false);
      setIsConnected(false);
      hasJoinedRef.current = false;
    }
  }, [callId, isConnecting]);

  // ── Leave ──────────────────────────────────────────────────────────────
  const leaveCall = useCallback(
    async (skipSignal = false) => {
      if (leavingRef.current) return;
      leavingRef.current = true;

      const service = agoraServiceRef.current;

      try {
        if (!skipSignal && callId && hasJoinedRef.current && service) {
          try {
            await sendCallSignal(callId, 'agora_leave', {}, 'ended');
          } catch (signalError) {
            console.warn('Failed to send leave signal:', signalError);
          }
        }

        if (service) {
          try {
            await service.leave();
          } catch (leaveError) {
            console.warn('Error leaving Agora channel:', leaveError);
          }
        }

        hasJoinedRef.current = false;

        if (signalChannelRef.current) {
          try { signalChannelRef.current.unsubscribe(); } catch { /* no-op */ }
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
      } finally {
        leavingRef.current = false;
      }
    },
    [callId]
  );

  // ── Media toggles ─────────────────────────────────────────────────────
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
