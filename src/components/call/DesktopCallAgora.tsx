import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigateToActiveCircle } from '@/lib/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileData } from '@/hooks/useProfileData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Bell, Video, VideoOff, Mic, MicOff, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCircle } from '@/contexts/CircleContext';
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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAgoraCall } from '@/hooks/useAgoraCall';
import { useCallTimer } from '@/hooks/useCallTimer';
import { useCallHeartbeat } from '@/hooks/useCallHeartbeat';
import { useCallExtension } from '@/hooks/useCallExtension';
import { useSupabaseChat } from '@/hooks/useSupabaseChat';
import { ProfileCard } from '@/components/home/ProfileCard';
import { SampleUser } from '@/data/sampleUsers';
import { endCall, updateRecipientPreset } from '@/lib/api/calls';
import { supabase } from '@/lib/supabase';
import { EndCallModal } from './EndCallModal';
import { ReconnectingOverlay } from './ReconnectingOverlay';
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
  const [isReconnecting, setIsReconnecting] = useState(false);
  const endingCallRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const agreedDuration = location.state?.agreedDuration || location.state?.duration || 15;
  const callStartTime = location.state?.callStartTime || null;
  const durationInSeconds = agreedDuration === 0 ? 999999 : agreedDuration * 60;

  // ── Unified call termination ──────────────────────────────────────────
  const terminateCall = async () => {
    if (endingCallRef.current) return;
    endingCallRef.current = true;
    try {
      if (callId) await endCall(callId).catch(() => {});
      await leaveCall();
    } catch { /* best-effort */ }
    navigate('/wrap-up', {
      state: { ...location.state, matchedUser, callId },
      replace: true,
    });
  };

  // ── Agora ─────────────────────────────────────────────────────────────
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
    retryCamera,
    agoraService,
  } = useAgoraCall({
    callId: callId || '',
    onRemoteUserJoined: () => setIsConnected(true),
    onRemoteHangup: () => {
      // Partner deliberately ended — show UserLeftModal with countdown
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      setIsReconnecting(false);
      setShowUserLeftModal(true);
    },
    onRemoteDisconnect: () => {
      // Partner's connection dropped — show reconnecting overlay, give 30s
      setIsConnected(false);
      setIsReconnecting(true);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        setIsReconnecting(false);
        terminateCall();
      }, 30_000);
    },
    onRemoteReconnected: () => {
      // Partner came back
      setIsConnected(true);
      setIsReconnecting(false);
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    },
  });

  const {
    formattedTime,
    showExtendPrompt,
    extendCall,
    declineExtend,
    isCallEnded,
  } = useCallTimer(durationInSeconds, callStartTime);

  const {
    iRequested,
    theyRequested,
    bothAgreed,
    theyDeclined,
    extended,
    requestExtension,
    approveExtension,
    declineExtension,
  } = useCallExtension(callId, extendCall);

  const {
    messages: chatMessages,
    sendMessage,
    isConnected: chatConnected,
    error: chatError,
  } = useSupabaseChat(callId, profileData?.id, profileData?.firstName || 'You');

  useCallHeartbeat(callId, isConnected);

  // Clear reconnect timer on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // Redirect to home if state is missing (page refresh = connection lost)
  useEffect(() => {
    if (!callId || !matchedUser) {
      navigateToActiveCircle(navigate, undefined, { replace: true });
    }
  }, [callId, matchedUser, navigate]);

  // Auto-join on mount
  useEffect(() => {
    if (callId && !isConnected && !isConnecting) joinCall();
    return () => { if (callId) leaveCall(true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  // Save recipient preset
  useEffect(() => {
    if (!callId) return;
    const nav = location.state as any;
    if (nav?.topic || nav?.customTopics || nav?.customQuestions) {
      updateRecipientPreset(callId, {
        topicPreset: nav.topic,
        presetType: nav.presetType,
        customTopics: nav.customTopics,
        customQuestions: nav.customQuestions,
      }).catch((err) => console.error('Failed to update recipient preset:', err));
    }
  }, [callId, location.state]);

  // Timer-ended → terminate
  useEffect(() => {
    if (isCallEnded) terminateCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCallEnded]);

  // Branding reflects the call's circle (the active circle the user entered),
  // not a hardcoded default. Member count is this circle's online members.
  const { circle, memberCounts } = useCircle();
  const circleData = {
    name: circle?.name || 'Your circle',
    members: (memberCounts?.online ?? 0).toString(),
    avatar: circle?.logo_url || '',
  };

  // ── Early return when state is missing ────────────────────────────────
  if (!callId || !matchedUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No active call</p>
          <Button onClick={() => navigateToActiveCircle(navigate)} className="mt-4">Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="h-16 max-w-[1920px] mx-auto bg-card/95 backdrop-blur-md rounded-full border border-border shadow-apple-md flex items-center justify-between px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${headerPattern})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

          {/* Logo click → end call modal (not bare navigate) */}
          <button onClick={() => setShowEndCallModal(true)} className="focus:outline-none relative z-10">
            <img src={logo} alt="TalkSpree" className="h-6" />
          </button>

          <div className="flex items-center gap-3 relative z-10">
            <div className="flex items-center gap-3 bg-background text-foreground neu-concave px-4 py-2 rounded-full transition-all">
              <Avatar className="h-8 w-8 border border-border/50">
                <AvatarImage src={circleData.avatar} />
                <AvatarFallback className="bg-muted text-sm">{circleData.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold">{circleData.name}</span>
              <div className="flex items-center gap-1.5 ml-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-medium">{circleData.members} members online</span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full transition-transform hover:scale-105">
                  <UserAvatar
                    src={profileData.profilePicture}
                    firstName={profileData.firstName}
                    lastName={profileData.lastName}
                    className="h-9 w-9"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card">
                <DropdownMenuItem onClick={() => setShowProfile(true)} className="cursor-pointer justify-center">View Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await signOut(); navigate('/auth'); }} className="cursor-pointer justify-center gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
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
            <AgoraCameraViewDesktop
              agoraService={agoraService}
              isRemote
              remoteUsers={remoteUsers}
              name={`${matchedUser.firstName} ${matchedUser.lastName}`}
              profilePicture={matchedUser.profilePicture}
              className="flex-1 min-h-0"
            />
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
              onRetryCamera={retryCamera}
              className="flex-1 min-h-0"
            />
          </div>

          {/* Middle: Prompt & Chat */}
          <div className="flex flex-col gap-3 overflow-hidden">
            <PromptDisplay callId={callId} callStartTime={callStartTime} className="flex-shrink-0" />
            <div className="flex-1 min-h-0 bg-card rounded-lg border border-border shadow-apple-md overflow-hidden">
              <ChatBox
                correspondentName={`${matchedUser.firstName} ${matchedUser.lastName}`}
                correspondentPicture={matchedUser.profilePicture}
                myPicture={profileData?.profilePicture}
                showExtendPrompt={showExtendPrompt}
                iRequested={iRequested}
                theyRequested={theyRequested}
                bothAgreed={bothAgreed}
                theyDeclined={theyDeclined}
                chatMessages={chatMessages}
                onSendMessage={sendMessage}
                onExtendRequest={requestExtension}
                onExtendApprove={approveExtension}
                onExtendDecline={declineExtension}
                onEndCall={() => setShowEndCallModal(true)}
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

      <ProfileCard open={showProfile} onOpenChange={setShowProfile} hideEditButton />

      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogTitle className="sr-only">End call confirmation</DialogTitle>
          <div className="text-center space-y-4 p-4">
            <h2 className="text-xl font-bold">End Call?</h2>
            <p className="text-muted-foreground">Are you sure you want to end this call?</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowEndConfirm(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => { setShowEndConfirm(false); terminateCall(); }}>END</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      <EndCallModal open={showEndCallModal} onConfirm={() => { setShowEndCallModal(false); terminateCall(); }} onCancel={() => setShowEndCallModal(false)} />

      <ReconnectingOverlay show={isReconnecting} userName={matchedUser?.firstName || 'Your partner'} />

      <UserLeftModal
        open={showUserLeftModal}
        userName={matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Your partner'}
        onCountdownComplete={() => { setShowUserLeftModal(false); terminateCall(); }}
      />
    </div>
  );
}

function AgoraCameraViewDesktop({
  agoraService,
  isRemote,
  remoteUsers,
  localVideoTrack,
  name,
  profilePicture,
  role,
  isLocal = false,
  cameraEnabled = true,
  micEnabled = true,
  onToggleCamera,
  onToggleMic,
  onRetryCamera,
  className = '',
}: any) {
  const videoRef = React.useRef<HTMLDivElement>(null);
  const [retrying, setRetrying] = React.useState(false);

  // Camera is unavailable (not merely toggled off) when we have no track at all.
  const cameraUnavailable = !isRemote && !localVideoTrack;

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await onRetryCamera?.();
    } finally {
      setRetrying(false);
    }
  };

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    (async () => {
      try {
        if (isRemote && remoteUsers?.length > 0 && remoteUsers[0].videoTrack) {
          await remoteUsers[0].videoTrack.play(el);
        } else if (!isRemote && localVideoTrack && cameraEnabled) {
          await localVideoTrack.play(el);
        }
      } catch (err) {
        console.error('Error playing video:', err);
      }
    })();

    return () => {
      // Only clear the container — don't call .stop() on individual tracks here.
      // AgoraService.leave() handles track cleanup. Calling .stop() here races
      // with React DOM reconciliation and causes "removeChild" errors.
      try { if (el) el.innerHTML = ''; } catch { /* Agora already cleaned up */ }
    };
  }, [isRemote, remoteUsers, localVideoTrack, cameraEnabled]);

  const hasVideo = isRemote
    ? remoteUsers?.length > 0 && remoteUsers[0].videoTrack
    : localVideoTrack && cameraEnabled;

  return (
    <div className={`relative bg-muted rounded-lg overflow-hidden ${className}`}>
      {/* Always mount the video container so Agora-injected DOM nodes don't conflict
          with React's reconciliation (prevents removeChild errors). */}
      <div ref={videoRef} className={`w-full h-full ${hasVideo ? '' : 'hidden'}`} />
      <div className={`w-full h-full flex flex-col items-center justify-center gap-3 bg-muted absolute inset-0 ${hasVideo ? 'hidden' : ''}`}>
        <UserAvatar src={profilePicture} name={name} className="h-24 w-24" fallbackClassName="text-3xl" />
        {cameraUnavailable && (
          <Button variant="secondary" size="sm" className="rounded-full gap-1.5" onClick={handleRetry} disabled={retrying}>
            <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Enabling…' : 'Camera unavailable — Retry'}
          </Button>
        )}
      </div>
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
        <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-sm font-medium">{name}</span>
        </div>
        {role && !isLocal && (
          <div className="bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <span className="text-xs font-medium text-muted-foreground">
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
          </div>
        )}
      </div>
      {isLocal && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <Button size="icon" variant={cameraEnabled ? 'secondary' : 'destructive'} className="h-9 w-9 rounded-full" onClick={onToggleCamera}>
            {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant={micEnabled ? 'secondary' : 'destructive'} className="h-9 w-9 rounded-full" onClick={onToggleMic}>
            {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
