/**
 * Agora Call Hook
 * Manages Agora video call connection and state
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { IAgoraRTCRemoteUser, UID } from 'agora-rtc-sdk-ng';
import { AgoraService } from '@/lib/agora/client';
import { getAgoraToken, updateCallWithAgoraInfo, sendCallSignal, subscribeToCallSignals } from '@/lib/api/agora';
import { supabase } from '@/lib/supabase';

export interface UseAgoraCallOptions {
  callId: string;
  onRemoteUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onRemoteUserLeft?: (user: IAgoraRTCRemoteUser) => void;
  onConnectionStateChange?: (state: string) => void;
}

export interface UseAgoraCallReturn {
  // Connection state
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Local media state
  isCameraOn: boolean;
  isMicOn: boolean;
  localVideoTrack: any;
  
  // Remote users
  remoteUsers: IAgoraRTCRemoteUser[];
  
  // Actions
  joinCall: () => Promise<void>;
  leaveCall: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
  switchCamera: () => Promise<void>;
  
  // Agora service
  agoraService: AgoraService | null;
}

export function useAgoraCall(options: UseAgoraCallOptions): UseAgoraCallReturn {
  const { callId, onRemoteUserJoined, onRemoteUserLeft, onConnectionStateChange } = options;
  
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

  // Initialize Agora service
  useEffect(() => {
    console.log('🎬 Initializing Agora service...');
    agoraServiceRef.current = new AgoraService();
    
    // Set up event listeners
    const service = agoraServiceRef.current;
    
    service.on('user-joined', (user) => {
      console.log('👤 Remote user joined:', user.uid);
      setRemoteUsers(prev => {
        const exists = prev.find(u => u.uid === user.uid);
        if (exists) return prev;
        return [...prev, user];
      });
      onRemoteUserJoined?.(user);
    });
    
    service.on('user-left', (user) => {
      console.log('👋 Remote user left:', user.uid);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      onRemoteUserLeft?.(user);
    });
    
    service.on('user-published', (user, mediaType) => {
      console.log('📡 Remote user published:', user.uid, mediaType);
      setRemoteUsers(prev => {
        const exists = prev.find(u => u.uid === user.uid);
        if (exists) {
          return prev.map(u => u.uid === user.uid ? user : u);
        }
        return [...prev, user];
      });
    });
    
    service.on('connection-state-change', (curState, revState, reason) => {
      console.log('🔄 Connection state:', curState, 'Previous:', revState, 'Reason:', reason);
      
      if (curState === 'CONNECTED') {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (curState === 'DISCONNECTED') {
        setIsConnected(false);
        setIsConnecting(false);
      } else if (curState === 'CONNECTING') {
        setIsConnecting(true);
      }
      
      onConnectionStateChange?.(curState);
    });

    return () => {
      // Cleanup on unmount
      if (hasJoinedRef.current) {
        console.log('🧹 Cleaning up Agora service on unmount...');
        leaveCall(true, true).catch(console.error);
      }
      
      if (signalChannelRef.current) {
        try {
          signalChannelRef.current.unsubscribe();
          signalChannelRef.current = null;
        } catch (e) {
          console.warn('Error unsubscribing on unmount:', e);
        }
      }
    };
  }, [callId, onRemoteUserJoined, onRemoteUserLeft, onConnectionStateChange]);

  const joinCall = useCallback(async () => {
    if (!agoraServiceRef.current || hasJoinedRef.current || isConnecting) {
      console.log('⚠️ Cannot join: service not ready, already joined, or connecting');
      return;
    }

    try {
      // Set flags BEFORE starting async operations to prevent double-join
      hasJoinedRef.current = true;
      setIsConnecting(true);
      setError(null);
      console.log('🚀 Joining call:', callId);

      // Get Agora token
      const { token, channelName, uid } = await getAgoraToken(callId);
      console.log('🔑 Got token for channel:', channelName, 'UID:', uid);

      // Update call with Agora info
      await updateCallWithAgoraInfo(callId, channelName, uid);

      // Join the channel
      await agoraServiceRef.current.join(channelName, token || null, uid);

      // Update local video track state to trigger re-render
      const videoTrack = agoraServiceRef.current.getLocalVideoTrack();
      setLocalVideoTrack(videoTrack);
      console.log('📹 Local video track set:', !!videoTrack);

      // Send join signal
      await sendCallSignal(callId, 'agora_join', { channelName, uid }, 'connected');

      // Subscribe to call signals
      signalChannelRef.current = subscribeToCallSignals(callId, async (signal) => {
        console.log('📨 Received signal:', signal);
        
        // Get current user to filter out own signals
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          console.warn('⚠️ No current user, ignoring signal');
          return;
        }
        
        // If the OTHER user left (not me), show notification
        if (signal.signal_type === 'agora_leave' && signal.user_id !== currentUser.id) {
          console.log('👋 Other user left the call - showing modal immediately');
          // Trigger onRemoteUserLeft callback to show modal
          if (options?.onRemoteUserLeft) {
            // Use current remote users or create a placeholder
            const currentRemoteUsers = agoraServiceRef.current?.getRemoteUsers();
            const remoteUser = currentRemoteUsers && currentRemoteUsers.size > 0 
              ? Array.from(currentRemoteUsers.values())[0]
              : { uid: signal.user_id } as any;
            
            // Call the callback to show modal
            options.onRemoteUserLeft(remoteUser);
          }
        }
      });

      setIsConnected(true);
      setIsConnecting(false);
      
      console.log('✅ Successfully joined call');
    } catch (err: any) {
      console.error('❌ Failed to join call:', err);
      setError(err.message || 'Failed to join call');
      setIsConnecting(false);
      setIsConnected(false);
      // Reset flag on error so user can retry
      hasJoinedRef.current = false;
    }
  }, [callId, isConnecting]);

  const leaveCall = useCallback(async (skipSignal = false, skipBackendEnd = false) => {
    // Check if already left
    if (!hasJoinedRef.current) {
      console.log('⚠️ Already left call, skipping');
      return;
    }

    try {
      console.log('👋 Leaving call...');
      
      // FIRST: Send leave signal to notify other user (unless we're leaving because other user left)
      if (!skipSignal && callId) {
        try {
          await sendCallSignal(callId, 'agora_leave', {}, 'ended');
          console.log('📤 Sent leave signal to other user');
        } catch (signalError) {
          console.warn('⚠️ Failed to send leave signal:', signalError);
        }
      }

      // SECOND: Leave Agora channel (clean up media)
      if (agoraServiceRef.current) {
        try {
          await agoraServiceRef.current.leave();
        } catch (leaveError) {
          console.warn('⚠️ Error leaving Agora channel:', leaveError);
        }
      }

      // Mark as left immediately to prevent double-leave
      hasJoinedRef.current = false;

      // THIRD: Unsubscribe from signals
      if (signalChannelRef.current) {
        try {
          signalChannelRef.current.unsubscribe();
          signalChannelRef.current = null;
        } catch (unsubError) {
          console.warn('⚠️ Error unsubscribing from signals:', unsubError);
        }
      }

      // FOURTH: Update state
      setIsConnected(false);
      setRemoteUsers([]);
      setLocalVideoTrack(null);
      
      console.log('✅ Successfully left call');
    } catch (err: any) {
      console.error('❌ Failed to leave call:', err);
      // Even on error, mark as left to prevent stuck state
      hasJoinedRef.current = false;
      setIsConnected(false);
      setRemoteUsers([]);
      setLocalVideoTrack(null);
    }
  }, [callId]);

  const toggleCamera = useCallback(async () => {
    if (!agoraServiceRef.current) return;

    try {
      const newState = await agoraServiceRef.current.toggleCamera();
      setIsCameraOn(newState);
    } catch (err: any) {
      console.error('❌ Failed to toggle camera:', err);
      setError(err.message || 'Failed to toggle camera');
    }
  }, []);

  const toggleMic = useCallback(async () => {
    if (!agoraServiceRef.current) return;

    try {
      const newState = await agoraServiceRef.current.toggleMic();
      setIsMicOn(newState);
    } catch (err: any) {
      console.error('❌ Failed to toggle mic:', err);
      setError(err.message || 'Failed to toggle mic');
    }
  }, []);

  const switchCamera = useCallback(async () => {
    if (!agoraServiceRef.current) return;

    try {
      await agoraServiceRef.current.switchCamera();
    } catch (err: any) {
      console.error('❌ Failed to switch camera:', err);
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

