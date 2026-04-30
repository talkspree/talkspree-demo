import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  RefreshCcw,
  MessageSquare,
  PhoneOff,
  RefreshCw,
  User,
  X,
  SendHorizontal,
  Smile,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgoraCall } from '@/hooks/useAgoraCall';
import { useCallTimer } from '@/hooks/useCallTimer';
import { useCallHeartbeat } from '@/hooks/useCallHeartbeat';
import { useCallExtension } from '@/hooks/useCallExtension';
import { useSharedPrompt } from '@/hooks/useSharedPrompt';
import { useSupabaseChat } from '@/hooks/useSupabaseChat';
import { useProfileData } from '@/hooks/useProfileData';
import { Badge } from '@/components/ui/badge';
import { interests } from '@/data/interests';
import { AboutMeSection } from '@/components/profile/AboutMeSection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SampleUser } from '@/data/sampleUsers';
import { endCall, updateRecipientPreset } from '@/lib/api/calls';
import { EndCallModal } from './EndCallModal';
import { ExtensionBanner } from './ExtensionBanner';
import { ReconnectingOverlay } from './ReconnectingOverlay';
import { UserLeftModal } from './UserLeftModal';
import { EmojiPicker } from '@/components/chat/mobile/EmojiPicker';

// Reusable glassmorphic surface used by the prompt card, PiP, timer pill, etc.
const GLASS_SURFACE =
  'bg-gradient-to-br from-white/10 to-transparent backdrop-blur-md border border-white/10 shadow-[0_4px_24px_0_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]';

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
  const [inputValue, setInputValue] = useState('');
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [showUserLeftModal, setShowUserLeftModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const initialChatScrollDoneRef = useRef(false);

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

  // Auto-scroll chat: instant on initial open, smooth thereafter
  useEffect(() => {
    if (!showChat) {
      initialChatScrollDoneRef.current = false;
      return;
    }
    if (!messagesEndRef.current) return;
    if (!initialChatScrollDoneRef.current && chatMessages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      initialChatScrollDoneRef.current = true;
    } else if (initialChatScrollDoneRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  const formatTime = (seconds: number): string => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}m${s.toString().padStart(2, '0')}s`; };
  const formatTimeShort = (seconds: number): string => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    sendMessage(text);
    setInputValue('');
    setEmojiPickerOpen(false);
  }, [inputValue, sendMessage]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    const input = chatInputRef.current;
    if (!input) {
      setInputValue((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? inputValue.length;
    const end = input.selectionEnd ?? inputValue.length;
    const next = inputValue.slice(0, start) + emoji + inputValue.slice(end);
    setInputValue(next);
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
    });
  }, [inputValue]);

  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    try { if ('vibrate' in navigator) navigator.vibrate(intensity === 'light' ? 10 : intensity === 'medium' ? 20 : 30); } catch { /* no-op */ }
  };
  const handleButtonClick = (action: () => void, hapticIntensity: 'light' | 'medium' | 'heavy' = 'light') => { triggerHaptic(hapticIntensity); action(); };

  // ── Early return ──────────────────────────────────────────────────────
  if (!callId || !matchedUser) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-white/70">No active call</p>
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
  const otherInitials = `${matchedUser.firstName?.[0] || ''}${matchedUser.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <div className="fixed inset-0 bg-zinc-950 overflow-hidden">
      {/* Mobile View */}
      <div className="h-screen flex flex-col relative text-white">
        <div ref={remoteVideoRef} className={`absolute inset-0 w-full h-full agora-video-container ${hasRemoteUser && remoteUsers[0].videoTrack ? '' : 'hidden'}`} />
        <div className={`absolute inset-0 w-full h-full bg-zinc-900 flex flex-col items-center justify-center ${hasRemoteUser && remoteUsers[0].videoTrack ? 'hidden' : ''}`}>
          <Avatar className="h-28 w-28 mb-4 border-4 border-white/10 shadow-xl">
            <AvatarImage src={matchedUser.profilePicture || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
              {matchedUser.firstName[0]}{matchedUser.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <p className="text-base font-medium text-white/70 tracking-wide animate-pulse">
            {hasRemoteUser ? 'Camera Stopped' : 'Connecting...'}
          </p>
        </div>

        {/* Top: Prompt / Small Talk card */}
        <div className="absolute top-safe top-5 left-4 right-4 z-30 pointer-events-none">
          <div className={`w-full ${GLASS_SURFACE} rounded-3xl px-5 py-4 saturate-100 pointer-events-auto transition-colors`}>
            {showSmallTalk ? (
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1 drop-shadow-sm">{smallTalkTimer}s</p>
                <p className="text-sm font-medium text-white/90">for Small-Talk!</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold text-white flex-1 drop-shadow-sm leading-snug">
                    "{currentQuestion?.text || 'Loading prompt...'}"
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-white rounded-full"
                    onClick={() => handleButtonClick(() => refreshPrompt().catch(console.error))}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 text-xs font-medium text-white/80 tracking-wide flex items-center gap-1.5">
                  <span className="opacity-70">Next in {formatTime(nextQuestionIn)}</span>
                  <span className="w-1 h-1 rounded-full bg-white/50" />
                  <span>{currentQuestion?.topic || preset.name}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {showExtendPrompt && !extended && (
          <div className="absolute top-36 left-4 right-4 z-30 animate-in fade-in slide-in-from-top-4 duration-300">
            <ExtensionBanner glass show iRequested={iRequested} theyRequested={theyRequested} bothAgreed={bothAgreed} theyDeclined={theyDeclined} userName={matchedUser.firstName || 'User'} onRequest={requestExtension} onApprove={approveExtension} onDecline={declineExtension} />
          </div>
        )}

        {/* Local video (Picture-in-Picture) */}
        <div className="absolute bottom-28 left-4 z-10 transition-all duration-300 animate-in fade-in zoom-in-95">
          <div className={`w-28 h-40 rounded-[28px] overflow-hidden relative ${GLASS_SURFACE}`}>
            <div ref={localVideoRef} className={`w-full h-full agora-video-container ${isCameraOn && localVideoTrack ? '' : 'hidden'}`} />
            <div className={`w-full h-full flex flex-col items-center justify-center absolute inset-0 ${isCameraOn && localVideoTrack ? 'hidden' : ''}`}>
              <Avatar className="h-12 w-12 border border-white/20 shadow-md mb-2">
                <AvatarImage src={profileData?.profilePicture || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {profileData?.firstName?.[0] || 'Y'}{profileData?.lastName?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium text-white/80">You</span>
            </div>
          </div>
        </div>

        {/* Profile button */}
        <Button
          size="icon"
          variant="ghost"
          className={`absolute bottom-28 right-4 z-20 h-16 w-16 rounded-full text-white ${GLASS_SURFACE} saturate-100 transition-all duration-300 animate-in fade-in zoom-in-95`}
          onClick={() => handleButtonClick(() => setShowProfile(true), 'light')}
        >
          <User size={30} strokeWidth={2} className="text-white" />
        </Button>

        {/* Bottom Timer pill */}
        <div className="absolute bottom-28 left-0 right-0 z-30 flex justify-center pointer-events-none transition-all duration-300">
          {(() => {
            const lowTime = parseInt(formattedTime.split(':')[0]) < 2;
            const lowGlass =
              'bg-red-500/40 backdrop-blur-md border border-red-300/40 shadow-[0_0_28px_rgba(239,68,68,0.55),inset_0_1px_1px_rgba(255,255,255,0.2)]';
            return (
              <div
                className={`${lowTime ? lowGlass : GLASS_SURFACE} px-4 py-1.5 rounded-full flex items-center pointer-events-auto saturate-100 transition-all duration-500 ${lowTime ? 'animate-pulse' : ''}`}
              >
                <span
                  className={`text-sm tracking-wider font-mono ${lowTime ? 'text-white font-bold drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]' : 'text-white font-semibold'}`}
                >
                  {formatTimeShort(parseInt(formattedTime.split(':')[0]) * 60 + parseInt(formattedTime.split(':')[1]))}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Bottom Nav */}
        <div className="absolute bottom-safe bottom-6 left-0 right-0 z-40 px-4 flex justify-center">
          <div className={`${GLASS_SURFACE} rounded-[2.5rem] p-2 flex items-center justify-center gap-2 w-max mx-auto`}>
            <Button
              size="icon"
              variant={isCameraOn ? 'ghost' : 'destructive'}
              className={`h-14 w-14 rounded-full text-white ${isCameraOn ? '' : ''}`}
              onClick={() => handleButtonClick(toggleCamera, 'medium')}
            >
              {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
            <Button
              size="icon"
              variant={isMicOn ? 'ghost' : 'destructive'}
              className={`h-14 w-14 rounded-full text-white ${isMicOn ? '' : ''}`}
              onClick={() => handleButtonClick(toggleMic, 'medium')}
            >
              {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-14 w-14 rounded-full text-white"
              onClick={() => handleButtonClick(switchCamera)}
            >
              <RefreshCcw className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-14 w-14 rounded-full relative text-white"
              onClick={() => handleButtonClick(() => setShowChat((p) => !p), 'light')}
            >
              <MessageSquare className="h-6 w-6" />
              {unreadCount > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-bold animate-in zoom-in-50 px-1 shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-destructive/90 text-white shadow-lg"
              onClick={() => handleButtonClick(() => setShowEndCallModal(true), 'heavy')}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {isConnecting && (<div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 bg-yellow-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg">Connecting...</div>)}
        {error && (<div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 bg-red-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg">Connection Error</div>)}

        {/* ── Chat Overlay (Messenger-style) ─────────────────────────── */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              key="chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-50 bg-black/80 flex flex-col justify-end"
              onClick={() => setShowChat(false)}
            >
              <motion.div
                key="chat-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full h-[85vh] rounded-t-[2rem] flex flex-col text-slate-900 shadow-2xl overflow-hidden"
              >
                {/* Chat header */}
                <header className="z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white/90 px-2 py-2 backdrop-blur-md">
                  <div className="flex min-w-0 items-center gap-2.5 px-2">
                    <div className="relative shrink-0">
                      {matchedUser.profilePicture ? (
                        <img
                          src={matchedUser.profilePicture}
                          alt={matchedUser.firstName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
                          {otherInitials}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-white bg-green-500" />
                    </div>
                    <div className="flex min-w-0 flex-col overflow-hidden text-left">
                      <span className="truncate text-[15px] font-semibold leading-tight tracking-tight text-gray-900">
                        {matchedUser.firstName} {matchedUser.lastName}
                      </span>
                      <span className="text-[12px] leading-tight text-gray-500">
                        On the call
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowChat(false)}
                    className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors active:bg-gray-200"
                    aria-label="Close chat"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </header>

                {/* Messages */}
                <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4 hide-scrollbar">
                  {/* Conversation header card */}
                  <div className="flex flex-col items-center pb-8 pt-4">
                    {matchedUser.profilePicture ? (
                      <img
                        src={matchedUser.profilePicture}
                        alt={matchedUser.firstName}
                        className="mb-3 h-24 w-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-2xl font-semibold text-white">
                        {otherInitials}
                      </div>
                    )}
                    <h2 className="text-xl font-bold text-gray-900">
                      {matchedUser.firstName} {matchedUser.lastName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Talkspree</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      You're on a call together
                    </p>
                  </div>

                  {chatMessages.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">
                      No messages yet. Say hi!
                    </div>
                  ) : (
                    chatMessages.map((message, index) => {
                      const isMe = message.isMe;
                      const next = chatMessages[index + 1];
                      const prev = chatMessages[index - 1];
                      const isNextSameSender = next?.senderId === message.senderId;
                      const isPrevSameSender = prev?.senderId === message.senderId;

                      let bubbleClasses = 'rounded-2xl';
                      if (isMe) {
                        if (isPrevSameSender) bubbleClasses += ' rounded-tr-[5px]';
                        if (isNextSameSender) bubbleClasses += ' rounded-br-[5px]';
                      } else {
                        if (isPrevSameSender) bubbleClasses += ' rounded-tl-[5px]';
                        if (isNextSameSender) bubbleClasses += ' rounded-bl-[5px]';
                      }

                      const marginTop = isPrevSameSender ? 'mt-0.5' : 'mt-3';
                      const showAvatar = !isMe && !isNextSameSender;
                      const reservesAvatarSpace = !isMe && isNextSameSender;

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={message.id}
                          className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${marginTop}`}
                        >
                          {showAvatar && (
                            <div className="mr-2 shrink-0 self-end">
                              {matchedUser.profilePicture ? (
                                <img
                                  src={matchedUser.profilePicture}
                                  alt=""
                                  className="h-7 w-7 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-[10px] font-semibold text-white">
                                  {otherInitials}
                                </div>
                              )}
                            </div>
                          )}
                          {reservesAvatarSpace && <div className="w-9 shrink-0" />}

                          <div
                            className={`relative max-w-[75%] select-none px-4 py-2 text-[15px] leading-snug ${bubbleClasses} ${
                              isMe
                                ? 'bg-[#0084FF] text-white'
                                : 'bg-[#F0F2F5] text-black'
                            }`}
                          >
                            <span className="whitespace-pre-wrap break-words">{message.text}</span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}

                  <div ref={messagesEndRef} className="h-2" />
                </div>

                {/* Input */}
                <footer className="relative z-10 flex shrink-0 flex-col gap-2 border-t border-gray-100 bg-white p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
                  <EmojiPicker
                    open={emojiPickerOpen}
                    onClose={() => setEmojiPickerOpen(false)}
                    onSelect={handleEmojiSelect}
                  />

                  <div className="flex w-full flex-row items-center gap-2">
                    <div className="relative flex min-h-[40px] flex-1 items-center rounded-full bg-gray-100 px-3 pl-4">
                      <input
                        ref={chatInputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Message…"
                        className="w-full bg-transparent py-2.5 text-[15px] placeholder-gray-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setEmojiPickerOpen((prev) => !prev)}
                        className={`ml-2 shrink-0 p-1 transition-colors ${
                          emojiPickerOpen ? 'text-blue-600' : 'text-[#0084FF]'
                        }`}
                        aria-label="Insert emoji"
                        aria-expanded={emojiPickerOpen}
                      >
                        <Smile className="h-6 w-6" strokeWidth={2} />
                      </button>
                    </div>

                    <AnimatePresence mode="popLayout">
                      {inputValue.trim() && (
                        <motion.button
                          key="send"
                          type="button"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          onClick={handleSend}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-sm transition-colors active:bg-blue-600"
                          aria-label="Send"
                        >
                          <SendHorizontal className="-ml-0.5 h-5 w-5" strokeWidth={2.5} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </footer>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Modal (mobile) */}
      {showProfile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in-0"
            onClick={() => setShowProfile(false)}
          />
          <div className="relative w-full max-w-3xl bg-card rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 fade-in-0 duration-300 border border-white/10">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 p-2 z-50 rounded-full bg-muted/80 backdrop-blur text-muted-foreground transition-colors"
            >
              <X size={20} />
            </button>
            <div className="overflow-y-auto custom-scrollbar-contact pl-6 pr-2 mr-2">
              <div className="flex flex-col gap-6 items-center text-center mb-8 pt-6">
                <div className="w-32 h-32 shrink-0 rounded-full ring-4 ring-primary/20 shadow-xl overflow-hidden bg-muted">
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
                  <p className="text-foreground leading-relaxed text-base">{matchedUser.bio}</p>
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
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${isCommon ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105' : 'bg-muted/50 text-muted-foreground border-transparent'}`}
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
