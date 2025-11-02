import { useState, useEffect } from 'react';

export function useVideoStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let currentStream: MediaStream | null = null;
    
    const startStream = async () => {
      try {
        console.log('🎥 Requesting camera access...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        
        console.log('✅ Camera access granted:', {
          video: mediaStream.getVideoTracks().length,
          audio: mediaStream.getAudioTracks().length
        });
        
        if (mounted) {
          currentStream = mediaStream;
          setStream(mediaStream);
          setError(null);
          console.log('✅ Stream set to state');
        } else {
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error('❌ Error accessing media devices:', err);
        if (mounted) {
          setError('Failed to access camera/microphone. Please allow permissions.');
        }
      }
    };

    startStream();
    
    return () => {
      mounted = false;
      if (currentStream) {
        console.log('🧹 Cleaning up stream');
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !cameraEnabled;
        videoTrack.enabled = newState;
        setCameraEnabled(newState);
      }
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !micEnabled;
        audioTrack.enabled = newState;
        setMicEnabled(newState);
      }
    }
  };

  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return {
    stream,
    cameraEnabled,
    micEnabled,
    facingMode,
    error,
    toggleCamera,
    toggleMic,
    flipCamera
  };
}
