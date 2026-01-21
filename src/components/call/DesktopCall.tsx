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
import { CameraView } from './CameraView';
import { PromptDisplay } from './PromptDisplay';
import { ChatBox } from './ChatBox';
import { CorrespondentProfile } from './CorrespondentProfile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useVideoStream } from '@/hooks/useVideoStream';
import { useCallTimer } from '@/hooks/useCallTimer';
import { ProfileCard } from '@/components/home/ProfileCard';
import { SampleUser, sampleUserManager } from '@/data/sampleUsers';

export function DesktopCall() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { profileData } = useProfileData();
  const matchedUser = location.state?.matchedUser as SampleUser | undefined;
  const [isConnected, setIsConnected] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  
  // Get duration from navigation state, default to 15 minutes
  const sessionDuration = location.state?.duration || 15;
  const durationInSeconds = sessionDuration === 0 ? 999999 : sessionDuration * 60;
  
  const {
    stream,
    cameraEnabled,
    micEnabled,
    toggleCamera,
    toggleMic
  } = useVideoStream();

  const {
    formattedTime,
    showExtendPrompt,
    extendCall,
    declineExtend,
    isCallEnded
  } = useCallTimer(durationInSeconds);

  // Navigate to wrap-up when call ends
  useEffect(() => {
    if (isCallEnded) {
      navigate('/wrap-up', { 
        state: { 
          matchedUser,
          ...location.state
        },
        replace: true 
      });
    }
  }, [isCallEnded, navigate, matchedUser, location.state]);

  const circleData = {
    name: 'Mentor the Young',
    members: sampleUserManager.getOnlineCount().toString(),
    avatar: ''
  };

  const handleEndCall = () => {
    setShowEndConfirm(true);
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
          <CameraView
            stream={stream}
            name={matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Unknown User'}
            profilePicture={matchedUser?.profilePicture}
            className="flex-1 min-h-0"
          />
          <CameraView
            stream={stream}
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
          <PromptDisplay
            topic={(location.state as any)?.topic}
            customTopics={(location.state as any)?.customTopics}
            customQuestions={(location.state as any)?.customQuestions}
            className="flex-shrink-0"
          />
          <div className="flex-1 min-h-0 bg-card rounded-lg border border-border shadow-apple-md overflow-hidden">
            <ChatBox
              correspondentName={matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Unknown User'}
              showExtendPrompt={showExtendPrompt}
              onExtendAccept={extendCall}
              onExtendDecline={declineExtend}
              onEndCall={handleEndCall}
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
                onClick={() => {
                  setShowEndConfirm(false);
                  navigate('/wrap-up', { 
                    state: { 
                      matchedUser,
                      ...location.state
                    },
                    replace: true 
                  });
                }}
              >
                END
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
