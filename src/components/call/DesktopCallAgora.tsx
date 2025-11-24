import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileData } from '@/hooks/useProfileData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logo from '@/assets/logo.svg';
import headerPattern from '@/assets/header-pattern.png';
import { PromptDisplay } from './PromptDisplay';
import { ChatBox } from './ChatBox';
import { CorrespondentProfile } from './CorrespondentProfile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAgoraCall } from '@/hooks/useAgoraCall';
import { useCallTimer } from '@/hooks/useCallTimer';
import { ProfileCard } from '@/components/home/ProfileCard';
import { SampleUser } from '@/data/sampleUsers';
import { endCall } from '@/lib/api/calls';
import { supabase } from '@/lib/supabase';
import { EndCallModal } from './EndCallModal';
import { UserLeftModal } from './UserLeftModal';

export function DesktopCallAgora() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { profileData } = useProfileData();
  const matchedUser = location.state?.matchedUser as SampleUser | undefined;
  const callId = location.state?.callId as string | undefined;
  
  const [isConnected, setIsConnected] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [showUserLeftModal, setShowUserLeftModal] = useState(false);
  
  // Get duration from navigation state, default to 15 minutes
  const sessionDuration = location.state?.duration || 15;
  const durationInSeconds = sessionDuration === 0 ? 999999 : sessionDuration * 60;
  
  // Agora call hook
  const {
    isConnecting,
    error,
    isCameraOn: cameraEnabled,
    isMicOn: micEnabled,
    localVideoTrack,
    remoteUsers,
    joinCall,
    leaveCall,
    toggleCamera,
    toggleMic,
    agoraService,
  } = useAgoraCall({
    callId: callId || '',
    onRemoteUserJoined: (user) => {
      console.log('🎉 Remote user joined:', user.uid);
      setIsConnected(true);
    },
    onRemoteUserLeft: (user) => {
      console.log('👋 Remote user left:', user.uid);
      setIsConnected(false);
      // Show modal that other user left
      setShowUserLeftModal(true);
    },
  });

  const {
    formattedTime,
    showExtendPrompt,
    extendCall,
    declineExtend,
    isCallEnded
  } = useCallTimer(durationInSeconds);

  // Auto-join call on mount (only once per callId)
  useEffect(() => {
    if (callId && !isConnected && !isConnecting) {
      console.log('🚀 Auto-joining call:', callId);
      joinCall();
    }

    return () => {
      if (callId) {
        leaveCall();
      }
    };
    // Only re-run if callId changes, not if joinCall/leaveCall change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  // Navigate to wrap-up when call timer ends
  useEffect(() => {
    if (isCallEnded) {
      handleEndCallConfirm();
    }
  }, [isCallEnded]);

  const [onlineCount, setOnlineCount] = React.useState(0);

  // Get real online users count
  React.useEffect(() => {
    const fetchOnlineCount = async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true);
      setOnlineCount(count || 0);
    };
    fetchOnlineCount();
  }, []);

  const circleData = {
    name: 'Mentor the Young',
    members: onlineCount.toString(),
    avatar: ''
  };

  const handleEndCallClick = () => {
    setShowEndCallModal(true);
  };

  const handleEndCallConfirm = async () => {
    setShowEndCallModal(false);
    
    try {
      // End call in backend FIRST
      if (callId) {
        try {
          await endCall(callId);
          console.log('✅ Call ended in backend');
        } catch (backendError) {
          console.warn('⚠️ Failed to end call in backend:', backendError);
        }
      }
      
      // Then leave Agora (sends signal to other user)
      await leaveCall();
      
      // Navigate to wrap-up
      navigate('/wrap-up', { 
        state: { 
          matchedUser,
          callId,
          ...location.state
        },
        replace: true 
      });
    } catch (error) {
      console.error('Error ending call:', error);
      // Navigate anyway
      navigate('/wrap-up', { 
        state: { 
          matchedUser,
          callId,
          ...location.state
        },
        replace: true 
      });
    }
  };

  const handleEndCallCancel = () => {
    setShowEndCallModal(false);
  };

  const handleUserLeftCountdownComplete = async () => {
    try {
      // End call in backend
      if (callId) {
        try {
          await endCall(callId);
          console.log('✅ Call ended in backend (other user left)');
        } catch (backendError) {
          console.warn('⚠️ Failed to end call in backend:', backendError);
        }
      }
      
      // Leave Agora (skip signal since other user already left)
      await leaveCall(true);
      
      // Navigate to wrap-up
      navigate('/wrap-up', { 
        state: { 
          matchedUser,
          callId,
          ...location.state
        },
        replace: true 
      });
    } catch (error) {
      console.error('Error ending call:', error);
      // Navigate anyway
      navigate('/wrap-up', { 
        state: { 
          matchedUser,
          callId,
          ...location.state
        },
        replace: true 
      });
    }
  };

  if (!callId || !matchedUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No active call</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Create fake stream object for CameraView compatibility
  const createAgoraStreamForCameraView = (videoTrack: any) => {
    if (!videoTrack) return null;
    // CameraView expects a MediaStream, but we'll pass Agora track via ref
    return null;
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="h-16 max-w-[1920px] mx-auto bg-card/95 backdrop-blur-md rounded-full border border-border shadow-apple-md flex items-center justify-between px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${headerPattern})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          
          <button onClick={() => navigate('/')} className="focus:outline-none relative z-10">
            <img src={logo} alt="TalkSpree" className="h-6" />
          </button>

          <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full relative z-10">
            <Avatar className="h-8 w-8">
              <AvatarImage src={circleData.avatar} />
              <AvatarFallback className="bg-warning text-warning-foreground">
                M
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold">{circleData.name}</span>
            <div className="flex items-center gap-1.5 ml-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="font-medium">{circleData.members} members online</span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-card">
                <div className="p-3 border-b border-border">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    {profileData.profilePicture ? (
                      <AvatarImage src={profileData.profilePicture} alt="Profile" />
                    ) : null}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {profileData.firstName && profileData.lastName 
                        ? `${profileData.firstName[0]}${profileData.lastName[0]}`
                        : <User className="h-5 w-5" />
                      }
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card">
                <DropdownMenuItem onClick={() => setShowProfile(true)} className="cursor-pointer">
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }} className="cursor-pointer">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto grid grid-cols-[280px_1fr_280px] lg:grid-cols-[350px_1fr_350px] gap-3 lg:gap-4 overflow-hidden">
        {/* Left: Camera Views */}
        <div className="flex flex-col gap-3 overflow-hidden">
          {/* Remote User Video */}
          <AgoraCameraViewDesktop
            agoraService={agoraService}
            isRemote={true}
            remoteUsers={remoteUsers}
            name={matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Unknown User'}
            profilePicture={matchedUser?.profilePicture}
            className="flex-1 min-h-0"
          />
          {/* Local User Video */}
          <AgoraCameraViewDesktop
            agoraService={agoraService}
            isRemote={false}
            localVideoTrack={localVideoTrack}
            name="You"
            profilePicture={profileData.profilePicture}
            isLocal
            cameraEnabled={cameraEnabled}
            micEnabled={micEnabled}
            onToggleCamera={toggleCamera}
            onToggleMic={toggleMic}
            className="flex-1 min-h-0"
          />
        </div>

        {/* Middle: Prompt & Chat */}
        <div className="flex flex-col gap-3 overflow-hidden">
          <PromptDisplay className="flex-shrink-0" />
          <div className="flex-1 min-h-0 bg-card rounded-lg border border-border shadow-apple-md overflow-hidden">
            <ChatBox
              correspondentName={matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Unknown User'}
              showExtendPrompt={showExtendPrompt}
              onExtendAccept={extendCall}
              onExtendDecline={declineExtend}
              onEndCall={handleEndCallClick}
              className="h-full"
            />
          </div>
          <div className="text-center py-2 flex-shrink-0 bg-card rounded-full border border-border shadow-apple-sm px-6">
            <span className={`text-lg font-semibold ${parseInt(formattedTime.split(':')[0]) < 2 ? 'text-destructive' : 'text-primary'}`}>
              {formattedTime}
            </span>
            <span className="text-muted-foreground ml-2">minutes remaining...</span>
          </div>
        </div>

        {/* Right: Profile */}
        <div className="overflow-hidden">
          <CorrespondentProfile matchedUser={matchedUser} isConnected={isConnected} className="h-full" />
        </div>
        </div>
      </div>

      {/* Profile Card Modal */}
      <ProfileCard open={showProfile} onOpenChange={setShowProfile} />

      {/* End Call Confirmation Dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="max-w-sm">
          <div className="text-center space-y-4 p-4">
            <h2 className="text-xl font-bold">End Call?</h2>
            <p className="text-muted-foreground">Are you sure you want to end this call?</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEndConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleEndCallClick}
              >
                END
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connection Status Overlay */}
      {isConnecting && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-white px-6 py-3 rounded-full text-sm shadow-lg">
          Connecting to call...
        </div>
      )}

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-full text-sm shadow-lg">
          Connection Error: {error}
        </div>
      )}

      {/* End Call Confirmation Modal */}
      <EndCallModal
        open={showEndCallModal}
        onConfirm={handleEndCallConfirm}
        onCancel={handleEndCallCancel}
      />

      {/* User Left Modal */}
      <UserLeftModal
        open={showUserLeftModal}
        userName={matchedUser?.firstName || 'User'}
        onCountdownComplete={handleUserLeftCountdownComplete}
      />
    </div>
  );
}

// Helper component for desktop camera views with Agora
function AgoraCameraViewDesktop({
  agoraService,
  isRemote,
  remoteUsers,
  localVideoTrack,
  name,
  profilePicture,
  isLocal = false,
  cameraEnabled = true,
  micEnabled = true,
  onToggleCamera,
  onToggleMic,
  className = '',
}: any) {
  const videoRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const playVideo = async () => {
      if (!videoRef.current) return;

      try {
        if (isRemote && remoteUsers && remoteUsers.length > 0) {
          const remoteUser = remoteUsers[0];
          if (remoteUser.videoTrack) {
            console.log('🎥 Playing remote video in desktop view');
            await remoteUser.videoTrack.play(videoRef.current);
          }
        } else if (!isRemote && localVideoTrack && cameraEnabled) {
          console.log('🎥 Playing local video in desktop view');
          await localVideoTrack.play(videoRef.current);
        }
      } catch (error) {
        console.error('Error playing video:', error);
      }
    };

    playVideo();

    return () => {
      // Cleanup: stop playing video when component unmounts or track changes
      if (videoRef.current) {
        videoRef.current.innerHTML = '';
      }
    };
  }, [isRemote, remoteUsers, localVideoTrack, cameraEnabled]);

  const hasVideo = isRemote ? (remoteUsers && remoteUsers.length > 0 && remoteUsers[0].videoTrack) : (localVideoTrack && cameraEnabled);

  return (
    <div className={`relative bg-muted rounded-lg overflow-hidden ${className}`}>
      {hasVideo ? (
        <div ref={videoRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profilePicture || ''} />
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

// Import React for the helper component
import * as React from 'react';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
