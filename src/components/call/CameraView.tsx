import { useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CameraViewProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  cameraEnabled?: boolean;
  micEnabled?: boolean;
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
  className?: string;
}

export function CameraView({ 
  stream, 
  name, 
  isLocal = false, 
  cameraEnabled = true,
  micEnabled = true,
  onToggleCamera,
  onToggleMic,
  className = ''
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-muted rounded-lg overflow-hidden ${className}`}>
      {cameraEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Avatar className="h-24 w-24">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Name Label */}
      <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
        <span className="text-sm font-medium">{name}</span>
      </div>

      {/* Controls for local video */}
      {isLocal && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <Button
            size="icon"
            variant={cameraEnabled ? "secondary" : "destructive"}
            className="h-9 w-9 rounded-full"
            onClick={onToggleCamera}
          >
            {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant={micEnabled ? "secondary" : "destructive"}
            className="h-9 w-9 rounded-full"
            onClick={onToggleMic}
          >
            {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
