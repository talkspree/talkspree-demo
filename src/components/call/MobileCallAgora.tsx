import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, FlipHorizontal, RefreshCcw, MessageSquare, PhoneOff, RefreshCw, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAgoraCall } from '@/hooks/useAgoraCall';
import { useCallTimer } from '@/hooks/useCallTimer';
import { useCallHeartbeat } from '@/hooks/useCallHeartbeat';
import { useCallExtension } from '@/hooks/useCallExtension';
import { useSharedPrompt } from '@/hooks/useSharedPrompt';
import { useSupabaseChat } from '@/hooks/useSupabaseChat';
import { useProfileData } from '@/hooks/useProfileData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { interests } from '@/data/interests';
import { AboutMeSection } from '@/components/profile/AboutMeSection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { SampleUser } from '@/data/sampleUsers';
import { endCall, updateRecipientPreset } from '@/lib/api/calls';
import { EndCallModal } from './EndCallModal';
import { ExtensionBanner } from './ExtensionBanner';
import { ReconnectingOverlay } from './ReconnectingOverlay';
import { UserLeftModal } from './UserLeftModal';

export function MobileCallAgora() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();

  const matchedUser = location.state?.matchedUser as SampleUser | undefined;
  const callId = location.state?.callId as string | undefined;

  const agreedDuration = location.state?.agreedDuration || location.state?.duration || 15;
  const callStartTime = location.state?.callStartTime || null;

  const [isConnected, setIsConnected] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [showUserLeftModal, setShowUserLeftModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [smallTalkTimer, setSmallTalkTimer] = useState(() => {
    if (!callStartTime) return 60;
    return Math.max(0, 60 - Math.floor((Date.now() - new Date(callStartTime).getTime()) / 1000));
  });
  const [showSmallTalk, setShowSmallTalk] = useState(() => {
    if (!callStartTime) return true;
    return (60 - Math.floor((Date.now() - new Date(callStartTime).getTime()) / 1000)) > 0;
  });
  const endingCallRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenOtherMessagesRef = useRef(0);

  useEffect(() => {
    if (!callStartTime) return;
    const remaining = Math.max(0, 60 - Math.floor((Date.now() - new Date(callStartTime).getTime()) / 1000));
    setSmallTalkTimer(remaining);
    setShowSmallTalk(remaining > 0);
  }, [callStartTime]);

  const { currentQuestion, nextQuestionIn, refreshPrompt, preset } = useSharedPrompt(callId);

  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);

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
    isCameraOn,
    isMicOn,
    localVideoTrack,
    remoteUsers,
    joinCall,
    leaveCall,
    toggleCamera,
    toggleMic,
    switchCamera,
    agoraService,
  } = useAgoraCall({
    callId: callId || '',
    onRemoteUserJoined: () => setIsConnected(true),
    onRemoteHangup: () => {
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      setIsReconnecting(false);
      setShowUserLeftModal(true);
    },
    onRemoteDisconnect: () => {
      setIsConnected(false);
      setIsReconnecting(true);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        setIsReconnecting(false);
        terminateCall();
      }, 30_000);
    },
    onRemoteReconnected: () => {
      setIsConnected(true);
      setIsReconnecting(false);
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    },
  });

  const {
    formattedTime,
    showExtendPrompt,
    extendCall: extendCallTimer,
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
  } = useCallExtension(callId, extendCallTimer);

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
      navigate('/', { replace: true });
    }
  }, [callId, matchedUser, navigate]);

  // Auto-join
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

  // Play remote video & audio
  useEffect(() => {
    (async () => {
      if (remoteUsers.length > 0 && remoteVideoRef.current) {
        const u = remoteUsers[0];
        try {
          if (u.videoTrack) await u.videoTrack.play(remoteVideoRef.current);
          if (u.audioTrack) await u.audioTrack.play();
        } catch (e) { console.error('Remote media error:', e); }
      }
    })();
    return () => { try { if (remoteVideoRef.current) remoteVideoRef.current.innerHTML = ''; } catch { /* no-op */ } };
  }, [remoteUsers]);

  // Play local video
  useEffect(() => {
    (async () => {
      if (localVideoTrack && localVideoRef.current && isCameraOn) {
        try { await localVideoTrack.play(localVideoRef.current); } catch (e) { console.error('Local video error:', e); }
      }
    })();
    return () => { try { if (localVideoRef.current) localVideoRef.current.innerHTML = ''; } catch { /* no-op */ } };
  }, [localVideoTrack, isCameraOn]);

  // Timer-ended → terminate
  useEffect(() => {
    if (isCallEnded) terminateCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCallEnded]);

  // Small-talk countdown
  useEffect(() => {
    if (!showSmallTalk) return;
    const i = setInterval(() => {
      setSmallTalkTimer((p) => { if (p <= 1) { setShowSmallTalk(false); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(i);
  }, [showSmallTalk]);

  // Track unread messages when chat sheet is closed
  useEffect(() => {
    const otherMessages = chatMessages.filter(m => !m.isMe);
    if (showChat) {
      seenOtherMessagesRef.current = otherMessages.length;
      setUnreadCount(0);
    } else {
      setUnreadCount(Math.max(0, otherMessages.length - seenOtherMessagesRef.current));
    }
  }, [chatMessages, showChat]);

  const formatTime = (seconds: number): string => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}m${s.toString().padStart(2, '0')}s`; };
  const formatTimeShort = (seconds: number): string => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  const handleSend = () => { if (inputValue.trim()) { sendMessage(inputValue); setInputValue(''); } };

  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    try { if ('vibrate' in navigator) navigator.vibrate(intensity === 'light' ? 10 : intensity === 'medium' ? 20 : 30); } catch { /* no-op */ }
  };
  const handleButtonClick = (action: () => void, hapticIntensity: 'light' | 'medium' | 'heavy' = 'light') => { triggerHaptic(hapticIntensity); action(); };

  // ── Early return ──────────────────────────────────────────────────────
  if (!callId || !matchedUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No active call</p>
          <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
        </div>
      </div>
    );
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const userInterests = matchedUser.interests
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);

  const currentUserInterests = (profileData?.interests || [])
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);

  const hasRemoteUser = remoteUsers.length > 0;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Mobile View */}
      <div className="h-screen flex flex-col">
        <div ref={remoteVideoRef} className={`absolute inset-0 w-full h-full agora-video-container ${hasRemoteUser && remoteUsers[0].videoTrack ? '' : 'hidden'}`} />
        <div className={`absolute inset-0 w-full h-full bg-muted flex flex-col items-center justify-center ${hasRemoteUser && remoteUsers[0].videoTrack ? 'hidden' : ''}`}>
          <Avatar className="h-24 w-24 mb-3">
            <AvatarImage src={matchedUser.profilePicture || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
              {matchedUser.firstName[0]}{matchedUser.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">{hasRemoteUser ? 'Camera Off' : 'Connecting...'}</p>
        </div>

        {/* Question / Small Talk */}
        <div className="absolute top-safe top-8 left-4 right-4 z-20">
          <div className="bg-gradient-primary rounded-3xl px-5 py-4 shadow-[2px_2px_10px_rgba(0,0,0,0.4)]">
            {showSmallTalk ? (
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">{smallTalkTimer}s</p>
                <p className="text-sm text-white/90">for Small-Talk!</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold text-white flex-1">
                    "{currentQuestion?.text || 'Loading prompt...'}"
                  </p>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-white" onClick={() => handleButtonClick(() => refreshPrompt().catch(console.error))}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 text-xs text-white/80">
                  <span>Next in {formatTime(nextQuestionIn)} • </span>
                  <span className="font-medium">*{currentQuestion?.topic || preset.name}*</span>
                </div>
              </>
            )}
          </div>
        </div>

        {showExtendPrompt && !extended && (
          <div className="absolute top-36 left-4 right-4 z-30 animate-in fade-in slide-in-from-top-2 duration-300">
            <ExtensionBanner show iRequested={iRequested} theyRequested={theyRequested} bothAgreed={bothAgreed} theyDeclined={theyDeclined} userName={matchedUser.firstName || 'User'} onRequest={requestExtension} onApprove={approveExtension} onDecline={declineExtension} />
          </div>
        )}

        {/* Local video */}
        <div className="absolute bottom-44 left-6 z-10">
          <div className="w-28 h-40 rounded-[32px] overflow-hidden border-2 border-white/90 shadow-apple-lg relative">
            <div ref={localVideoRef} className={`w-full h-full agora-video-container ${isCameraOn && localVideoTrack ? '' : 'hidden'}`} />
            <div className={`w-full h-full bg-muted flex items-center justify-center absolute inset-0 ${isCameraOn && localVideoTrack ? 'hidden' : ''}`}>
              <Avatar className="h-12 w-12">
                <AvatarImage src={profileData?.profilePicture || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {profileData?.firstName?.[0] || 'Y'}{profileData?.lastName?.[0] || ''}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Nav bar */}
        <div className="absolute bottom-safe bottom-20 left-0 right-0 z-20 px-6">
          <div className="bg-card/95 backdrop-blur-xl rounded-full px-6 py-4 shadow-apple-lg border border-border/50 flex items-center justify-around">
            <Button size="icon" variant={isCameraOn ? 'ghost' : 'destructive'} className="h-12 w-12 rounded-full" onClick={() => handleButtonClick(toggleCamera, 'medium')}>
              {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant={isMicOn ? 'ghost' : 'destructive'} className="h-12 w-12 rounded-full" onClick={() => handleButtonClick(toggleMic, 'medium')}>
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-12 w-12 rounded-full" onClick={() => handleButtonClick(switchCamera)}>
              <RefreshCcw className="h-5 w-5" />
            </Button>
            <Sheet open={showChat} onOpenChange={setShowChat}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="h-12 w-12 rounded-full relative" onClick={() => triggerHaptic()}>
                  <MessageSquare className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold animate-in zoom-in-50 px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] rounded-t-[28px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="flex flex-col h-full">
                  <h3 className="font-semibold text-lg mb-4">Chat</h3>
                  <ScrollArea className="flex-1 mb-4">
                    <div className="space-y-3">
                      <div className="flex justify-center"><div className="bg-muted px-4 py-2 rounded-full text-sm">You matched with {matchedUser.firstName} {matchedUser.lastName}!</div></div>
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} gap-2 items-end`}>
                          {!msg.isMe && (<Avatar className="h-8 w-8 mb-5 flex-shrink-0"><AvatarImage src={matchedUser.profilePicture} /><AvatarFallback className="bg-primary text-primary-foreground text-xs">{matchedUser.firstName?.charAt(0) || 'U'}</AvatarFallback></Avatar>)}
                          <div className="flex flex-col gap-1 max-w-[70%]">
                            <div className={`relative px-4 py-2 ${msg.isMe ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm' : 'bg-muted text-foreground rounded-2xl rounded-bl-sm'}`}>
                              <p className="text-sm break-words">{msg.text}</p>
                            </div>
                            <span className={`text-xs text-muted-foreground ${msg.isMe ? 'text-right' : 'text-left'}`}>
                              {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                          {msg.isMe && (<Avatar className="h-8 w-8 mb-5 flex-shrink-0"><AvatarImage src={profileData?.profilePicture} /><AvatarFallback className="bg-secondary text-secondary-foreground text-xs">You</AvatarFallback></Avatar>)}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input placeholder="Type a message..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="rounded-full" />
                    <Button size="icon" onClick={handleSend} className="rounded-full"><Send className="h-4 w-4" /></Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Button size="icon" className="h-12 w-12 rounded-full bg-destructive" onClick={() => handleButtonClick(() => setShowEndCallModal(true), 'heavy')}>
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Timer */}
        <div className="absolute bottom-safe bottom-8 left-0 right-0 z-10 flex justify-center">
          <div className="bg-background/50 backdrop-blur-sm rounded-full px-4 py-2">
            <span className={`text-sm font-medium ${parseInt(formattedTime.split(':')[0]) < 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatTimeShort(parseInt(formattedTime.split(':')[0]) * 60 + parseInt(formattedTime.split(':')[1]))}
            </span>
          </div>
        </div>

        {/* Profile button */}
        <Button size="icon" className="absolute bottom-44 right-6 z-20 h-14 w-14 rounded-full bg-gradient-primary shadow-[0_2px_10px_rgba(0,0,0,0.4)] backdrop-blur-sm border border-white/20 text-white" onClick={() => handleButtonClick(() => setShowProfile(true), 'light')}>
          <User className="h-6 w-6" />
        </Button>

        {isConnecting && (<div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-yellow-500/90 text-white px-4 py-2 rounded-full text-sm">Connecting...</div>)}
        {error && (<div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm">Connection Error</div>)}
      </div>

      {/* Profile Modal (mobile) — ContactDetailModal style */}
      {showProfile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity animate-in fade-in-0"
            onClick={() => setShowProfile(false)}
          />
          <div className="relative w-full max-w-3xl bg-card rounded-[1.5rem] shadow-[5px_5px_30px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 fade-in-0 duration-300">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 p-2 z-50 rounded-full bg-muted backdrop-blur text-muted-foreground transition-colors"
            >
              <X size={20} />
            </button>
            <div className="overflow-y-auto custom-scrollbar-contact pl-6 pr-2 mr-2">
              <div className="flex flex-col gap-6 items-center text-center mb-8 pt-6">
                <div className="w-32 h-32 shrink-0 rounded-full ring-4 ring-primary/20 shadow-apple-lg overflow-hidden bg-muted">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={matchedUser.profilePicture || ''} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl">
                      {matchedUser.firstName[0]}{matchedUser.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-4 pt-2">
                  <h2 className="text-3xl font-extrabold tracking-tight">{matchedUser.firstName} {matchedUser.lastName}</h2>
                  <AboutMeSection
                    role={matchedUser.role}
                    occupation={matchedUser.occupation}
                    industry={matchedUser.industry}
                    studyField={matchedUser.studyField}
                    university={matchedUser.university}
                    age={calculateAge(matchedUser.dateOfBirth)}
                    gender={matchedUser.gender}
                    location={matchedUser.location}
                    className="text-muted-foreground"
                  />
                </div>
              </div>
              <div className="space-y-6 pb-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Bio</h3>
                  <p className="text-muted-foreground leading-relaxed text-base">{matchedUser.bio}</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Contacts</h3>
                  <div className="flex flex-wrap gap-2">
                    {matchedUser.instagram && <Badge variant="secondary" className="bg-[#E1306C]/10 border-[#E1306C]/20 blur-[2px] select-none cursor-not-allowed"><span className="text-[#E1306C]">● Instagram</span></Badge>}
                    {matchedUser.facebook && <Badge variant="secondary" className="bg-[#1877F2]/10 border-[#1877F2]/20 blur-[2px] select-none cursor-not-allowed"><span className="text-[#1877F2]">● Facebook</span></Badge>}
                    {matchedUser.linkedin && <Badge variant="secondary" className="bg-[#0A66C2]/10 border-[#0A66C2]/20 blur-[2px] select-none cursor-not-allowed"><span className="text-[#0A66C2]">● LinkedIn</span></Badge>}
                    {matchedUser.youtube && <Badge variant="secondary" className="bg-[#FF0000]/10 border-[#FF0000]/20 blur-[2px] select-none cursor-not-allowed"><span className="text-[#FF0000]">● YouTube</span></Badge>}
                    {matchedUser.tiktok && <Badge variant="secondary" className="bg-[#000000]/10 border-[#000000]/20 blur-[2px] select-none cursor-not-allowed"><span className="text-[#000000] dark:text-[#FFFFFF]">● TikTok</span></Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-2">Connect after the call to view contact details</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Interests</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {userInterests.map((interest) => {
                      const isCommon = currentUserInterests.some(ui => ui?.id === interest!.id);
                      return (
                        <Badge
                          key={interest!.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${isCommon ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105' : 'bg-muted text-muted-foreground border-border'}`}
                        >
                          {interest!.emoji} {interest!.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Call inline confirm (old dialog) */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="max-w-sm mx-auto rounded-3xl w-[calc(100vw-2rem)] md:w-auto">
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
