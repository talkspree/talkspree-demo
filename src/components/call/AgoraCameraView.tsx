/**
 * Agora Camera View Component
 * Displays local and remote video streams from Agora
 */

import { useEffect, useRef } from 'react';
import { IAgoraRTCRemoteUser, ICameraVideoTrack } from 'agora-rtc-sdk-ng';
import { cn } from '@/lib/utils';

export interface AgoraCameraViewProps {
  localVideoTrack: ICameraVideoTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  isCameraOn: boolean;
  className?: string;
}

export function AgoraCameraView({
  localVideoTrack,
  remoteUsers,
  isCameraOn,
  className = '',
}: AgoraCameraViewProps) {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Play local video track
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && isCameraOn) {
      console.log('🎥 Playing local video track');
      localVideoTrack.play(localVideoRef.current);

      return () => {
        localVideoTrack.stop();
      };
    }
  }, [localVideoTrack, isCameraOn]);

  // Play remote video tracks
  useEffect(() => {
    remoteUsers.forEach((user) => {
      const container = remoteVideoRefs.current.get(user.uid.toString());
      
      if (user.videoTrack && container) {
        console.log('🎥 Playing remote video for user:', user.uid);
        user.videoTrack.play(container);
      }
      
      if (user.audioTrack) {
        console.log('🔊 Playing remote audio for user:', user.uid);
        user.audioTrack.play();
      }
    });

    return () => {
      remoteUsers.forEach((user) => {
        if (user.videoTrack) {
          user.videoTrack.stop();
        }
        if (user.audioTrack) {
          user.audioTrack.stop();
        }
      });
    };
  }, [remoteUsers]);

  const hasRemoteUser = remoteUsers.length > 0;
  const remoteUser = remoteUsers[0]; // For now, we handle 1-on-1 calls

  return (
    <div className={cn('relative w-full h-full bg-black overflow-hidden', className)}>
      {/* Remote user video (main view) */}
      {hasRemoteUser ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={(el) => {
              if (el && remoteUser) {
                remoteVideoRefs.current.set(remoteUser.uid.toString(), el);
              }
            }}
            className="w-full h-full"
            style={{ objectFit: 'cover' }}
          />
          {!remoteUser.videoTrack && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-4xl">
                    {remoteUser.uid?.toString().charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <p className="text-sm opacity-75">Camera is off</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-white">
            <div className="animate-pulse mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-700" />
            </div>
            <p className="text-sm opacity-75">Waiting for other participant...</p>
          </div>
        </div>
      )}

      {/* Local user video (picture-in-picture) */}
      <div className="absolute bottom-4 right-4 w-32 h-40 md:w-40 md:h-48 rounded-lg overflow-hidden shadow-lg border-2 border-white/20 bg-gray-900">
        {isCameraOn && localVideoTrack ? (
          <div ref={localVideoRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-xl">You</span>
              </div>
              <p className="text-xs opacity-75">Camera off</p>
            </div>
          </div>
        )}
      </div>

      {/* Connection status indicator */}
      {!hasRemoteUser && (
        <div className="absolute top-4 left-4 bg-yellow-500/90 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Connecting...
        </div>
      )}
    </div>
  );
}

