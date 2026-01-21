import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, FlipHorizontal, MessageSquare, PhoneOff, RefreshCw, User, X } from 'lucide-react';
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
import { CorrespondentProfile } from './CorrespondentProfile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { SampleUser } from '@/data/sampleUsers';
import { endCall, updateRecipientPreset } from '@/lib/api/calls';
import { supabase } from '@/lib/supabase';
import { EndCallModal } from './EndCallModal';
import { UserLeftModal } from './UserLeftModal';
import { ReconnectingOverlay } from './ReconnectingOverlay';
import { ExtensionBanner } from './ExtensionBanner';

export function MobileCallAgora() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();
  const matchedUser = location.state?.matchedUser as SampleUser | undefined;
  const callId = location.state?.callId as string | undefined;

  const [isConnected, setIsConnected] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [showUserLeftModal, setShowUserLeftModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [smallTalkTimer, setSmallTalkTimer] = useState(60);
  const [showSmallTalk, setShowSmallTalk] = useState(true);

  // Get agreed duration and start time from navigation state (set in WaitingRoom)
  const agreedDuration = location.state?.agreedDuration || location.state?.duration || 15;
  const callStartTime = location.state?.callStartTime || null;

  // Calculate initial small talk timer based on call start time
  useEffect(() => {
    if (callStartTime) {
      const startTime = new Date(callStartTime).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, 60 - elapsedSeconds);

      setSmallTalkTimer(remaining);
      setShowSmallTalk(remaining > 0);

      console.log(`⏱️ Small talk timer initialized: ${remaining}s remaining (call started ${elapsedSeconds}s ago)`);
    }
  }, [callStartTime]);

  // Don't pass local selection - the hook will load from database
  const { currentQuestion, nextQuestionIn, refreshPrompt, preset } = useSharedPrompt(callId);

  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);

  // Calculate duration in seconds (use 999999 for unlimited)
  const durationInSeconds = agreedDuration === 0 ? 999999 : agreedDuration * 60;

  // Log the call details on mount
  useEffect(() => {
    console.log(`📊 Call started with agreed duration: ${agreedDuration} minutes, started at ${callStartTime}`);
  }, [agreedDuration, callStartTime]);

  // Agora call hook
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
    onReconnecting: () => {
      console.log('🔄 Remote user disconnected - showing reconnecting overlay');
      setIsConnected(false);
      setIsReconnecting(true);
      setShowUserLeftModal(false);
    },
    onReconnectFailed: () => {
      console.log('❌ Reconnect failed - showing end call modal');
      setIsReconnecting(false);
      setShowUserLeftModal(true);
    },
    onRemoteUserRejoined: () => {
      console.log('🎉 Remote user rejoined - closing overlays');
      setIsConnected(true);
      setIsReconnecting(false);
      setShowUserLeftModal(false);
    },
    onRemoteHangup: () => {
      console.log('☎️ Remote user hung up');
      setIsConnected(false);
      setIsReconnecting(false);
      setShowUserLeftModal(true);
    },
  });

  const {
    formattedTime,
    showExtendPrompt,
    extendCall: extendCallTimer,
    declineExtend,
    isCallEnded
  } = useCallTimer(durationInSeconds, callStartTime);

  // Handle call extension requiring both users' agreement
  const {
    iRequested,
    theyRequested,
    bothAgreed,
    extended,
    requestExtension,
    approveExtension,
    declineExtension,
  } = useCallExtension(callId, extendCallTimer);

  // Real-time chat using Agora RTM
  const {
    messages: chatMessages,
    sendMessage,
    isConnected: chatConnected,
    error: chatError
  } = useSupabaseChat(
    callId,
    profileData?.id,
    profileData?.firstName || 'You'
  );

  // Send heartbeats while in call to detect disconnections
  useCallHeartbeat(callId, isConnected);

  // Auto-join call on mount (only once per callId)
  useEffect(() => {
    if (callId && !isConnected && !isConnecting) {
      joinCall();
    }

    return () => {
      if (callId) {
        leaveCall(true);
      }
    };
    // Only re-run if callId changes, not if joinCall/leaveCall change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  // Send recipient's topic preset when joining call
  useEffect(() => {
    if (callId && isConnected) {
      const nav = location.state as any;
      if (nav?.topic || nav?.customTopics || nav?.customQuestions) {
        updateRecipientPreset(callId, {
          topicPreset: nav.topic,
          customTopics: nav.customTopics,
          customQuestions: nav.customQuestions,
        }).catch(err => console.error('Failed to update recipient preset:', err));
      }
    }
  }, [callId, isConnected, location.state]);

  // Play remote video and audio
  useEffect(() => {
    const playRemoteMedia = async () => {
      if (remoteUsers.length > 0 && remoteVideoRef.current) {
        const remoteUser = remoteUsers[0];
        try {
          if (remoteUser.videoTrack) {
            console.log('🎥 Playing remote video');
            await remoteUser.videoTrack.play(remoteVideoRef.current);
          }
          if (remoteUser.audioTrack) {
            console.log('🔊 Playing remote audio');
            await remoteUser.audioTrack.play();
          }
        } catch (error) {
          console.error('Error playing remote media:', error);
        }
      }
    };

    playRemoteMedia();

    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.innerHTML = '';
      }
    };
  }, [remoteUsers]);

  // Play local video
  useEffect(() => {
    const playLocalVideo = async () => {
      if (localVideoTrack && localVideoRef.current && isCameraOn) {
        try {
          console.log('🎥 Playing local video');
          await localVideoTrack.play(localVideoRef.current);
        } catch (error) {
          console.error('Error playing local video:', error);
        }
      }
    };

    playLocalVideo();

    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.innerHTML = '';
      }
    };
  }, [localVideoTrack, isCameraOn]);

  // Navigate to wrap-up when call timer ends
  useEffect(() => {
    if (isCallEnded) {
      handleEndCallConfirm();
    }
  }, [isCallEnded]);

  useEffect(() => {
    if (!showSmallTalk) return;
    const interval = setInterval(() => {
      setSmallTalkTimer(prev => {
        if (prev <= 1) {
          setShowSmallTalk(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showSmallTalk]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs.toString().padStart(2, '0')}s`;
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const formatTimeShort = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerHaptic = async (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      if ('vibrate' in navigator) {
        const duration = intensity === 'light' ? 10 : intensity === 'medium' ? 20 : 30;
        navigator.vibrate(duration);
      }
    } catch (error) {
      console.log('Haptics not available');
    }
  };

  const handleButtonClick = (action: () => void, hapticIntensity: 'light' | 'medium' | 'heavy' = 'light') => {
    triggerHaptic(hapticIntensity);
    action();
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

  const hasRemoteUser = remoteUsers.length > 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Mobile View (default) */}
      <div className="md:hidden h-screen flex flex-col">
        {/* Fullscreen Video Background - Remote User */}
        {hasRemoteUser && remoteUsers[0].videoTrack ? (
          <div ref={remoteVideoRef} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-2">👤</div>
              <p className="text-muted-foreground">{hasRemoteUser ? 'Camera Off' : 'Connecting...'}</p>
            </div>
          </div>
        )}

        {/* Question Prompt or Small Talk - Top */}
        <div className="absolute top-safe top-8 left-4 right-4 z-20">
          <div className="bg-gradient-primary rounded-3xl px-5 py-4 shadow-apple-lg">
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 hover:bg-white/20 text-white"
                    onClick={() => {
                      handleButtonClick(() => {
                        refreshPrompt().catch(console.error);
                      });
                    }}
                  >
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

        {/* Extension Banner - Above Question Prompt */}
        {showExtendPrompt && !extended && (
          <div className="absolute top-28 left-4 right-4 z-30 animate-in fade-in slide-in-from-top-2 duration-300">
            <ExtensionBanner
              show={true}
              iRequested={iRequested}
              theyRequested={theyRequested}
              bothAgreed={bothAgreed}
              userName={matchedUser?.firstName || 'User'}
              onRequest={requestExtension}
              onApprove={approveExtension}
              onDecline={declineExtension}
            />
          </div>
        )}

        {/* Local Video Overlay - Rounded Bottom */}
        <div className="absolute bottom-44 left-6 z-10">
          <div className="w-28 h-40 rounded-[32px] overflow-hidden border-2 border-white/90 shadow-apple-lg">
            {isCameraOn && localVideoTrack ? (
              <div ref={localVideoRef} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted/50 backdrop-blur-sm flex items-center justify-center">
                <VideoOff className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="absolute bottom-safe bottom-20 left-0 right-0 z-20 px-6">
          <div className="bg-card/95 backdrop-blur-xl rounded-full px-6 py-4 shadow-apple-lg border border-border/50 flex items-center justify-around">
            <Button
              size="icon"
              variant={isCameraOn ? "ghost" : "destructive"}
              className="h-12 w-12 rounded-full hover:bg-accent"
              onClick={() => handleButtonClick(toggleCamera, 'medium')}
            >
              {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button
              size="icon"
              variant={isMicOn ? "ghost" : "destructive"}
              className="h-12 w-12 rounded-full hover:bg-accent"
              onClick={() => handleButtonClick(toggleMic, 'medium')}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12 rounded-full hover:bg-accent"
              onClick={() => handleButtonClick(switchCamera)}
            >
              <FlipHorizontal className="h-5 w-5" />
            </Button>

            <Sheet open={showChat} onOpenChange={setShowChat}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12 rounded-full hover:bg-accent"
                  onClick={() => triggerHaptic()}
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] rounded-t-[28px]">
                <div className="flex flex-col h-full">
                  <h3 className="font-semibold text-lg mb-4">Chat</h3>
                  <ScrollArea className="flex-1 mb-4">
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <div className="bg-muted px-4 py-2 rounded-full text-sm">
                          You matched with {matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Unknown User'}!
                        </div>
                      </div>
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} gap-2 items-end`}>
                          {!msg.isMe && (
                            <Avatar className="h-8 w-8 mb-5 flex-shrink-0">
                              <AvatarImage src={matchedUser?.profilePicture} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {matchedUser?.firstName?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div className="flex flex-col gap-1 max-w-[70%]">
                            <div className={`relative px-4 py-2 ${
                              msg.isMe 
                                ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm' 
                                : 'bg-muted text-foreground rounded-2xl rounded-bl-sm'
                            }`}>
                              <p className="text-sm break-words">{msg.text}</p>
                            </div>
                            <span className={`text-xs text-muted-foreground ${
                              msg.isMe ? 'text-right' : 'text-left'
                            }`}>
                              {msg.timestamp.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </span>
                          </div>

                          {msg.isMe && (
                            <Avatar className="h-8 w-8 mb-5 flex-shrink-0">
                              <AvatarImage src={profileData?.profilePicture} />
                              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                You
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      className="rounded-full"
                    />
                    <Button size="icon" onClick={handleSend} className="rounded-full">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-destructive hover:bg-destructive/90"
              onClick={() => handleButtonClick(() => setShowEndConfirm(true), 'heavy')}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Timer - Subtle at Bottom */}
        <div className="absolute bottom-safe bottom-8 left-0 right-0 z-10 flex justify-center">
          <div className="bg-background/50 backdrop-blur-sm rounded-full px-4 py-2">
            <span className={`text-sm font-medium ${parseInt(formattedTime.split(':')[0]) < 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatTimeShort(parseInt(formattedTime.split(':')[0]) * 60 + parseInt(formattedTime.split(':')[1]))}
            </span>
          </div>
        </div>

        {/* Floating Profile Button */}
        <Button
          size="icon"
          className="absolute bottom-44 right-6 z-20 h-14 w-14 rounded-full bg-gradient-primary hover:opacity-90 shadow-apple-lg backdrop-blur-sm border border-white/20 text-white"
          onClick={() => handleButtonClick(() => setShowProfile(true), 'light')}
        >
          <User className="h-6 w-6" />
        </Button>

        {/* Connection Status */}
        {isConnecting && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-yellow-500/90 text-white px-4 py-2 rounded-full text-sm">
            Connecting...
          </div>
        )}

        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm">
            Connection Error
          </div>
        )}
      </div>

      {/* Vertical Tablet View (md screens in portrait) */}
      <div className="hidden md:block lg:hidden h-screen flex flex-col p-4 gap-4">
        {/* Header */}
        <div className="w-full bg-card/95 backdrop-blur-md rounded-3xl p-4 border border-border shadow-apple-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <span className="text-white font-bold text-sm">TS</span>
              </div>
              <span className="font-semibold text-lg">TalkSpree</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-background/50 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-sm font-medium">
                  {formatTimeShort(parseInt(formattedTime.split(':')[0]) * 60 + parseInt(formattedTime.split(':')[1]))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cameras Row */}
        <div className="flex gap-4">
          <div className="flex-1 bg-muted rounded-3xl overflow-hidden relative shadow-apple-md border border-border aspect-[4/3]">
            {hasRemoteUser && remoteUsers[0].videoTrack ? (
              <div ref={remoteVideoRef} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-sm font-medium">{matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Unknown User'}</span>
            </div>
          </div>

          <div className="flex-1 bg-muted rounded-3xl overflow-hidden relative shadow-apple-md border border-border aspect-[4/3]">
            {isCameraOn && localVideoTrack ? (
              <div ref={localVideoRef} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-sm font-medium">You</span>
            </div>
            <div className="absolute top-3 right-3 flex gap-2">
              <Button
                size="icon"
                variant={isCameraOn ? "secondary" : "destructive"}
                className="h-9 w-9 rounded-full"
                onClick={() => handleButtonClick(toggleCamera, 'medium')}
              >
                {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant={isMicOn ? "secondary" : "destructive"}
                className="h-9 w-9 rounded-full"
                onClick={() => handleButtonClick(toggleMic, 'medium')}
              >
                {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid - Question/Chat on left, Profile on right */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Question Prompt */}
            <div className="bg-gradient-primary rounded-3xl px-5 py-4 shadow-apple-lg">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-semibold text-white flex-1">
                  "{currentQuestion?.text || 'Loading prompt...'}"
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 hover:bg-white/20 text-white"
                  onClick={() => refreshPrompt().catch(console.error)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 text-xs text-white/80">
                <span>Next in {formatTime(nextQuestionIn)} • </span>
                <span className="font-medium">*{currentQuestion?.topic || preset.name}*</span>
              </div>
            </div>

            {/* Chatbox */}
            <div className="flex-1 bg-card rounded-3xl border border-border shadow-apple-md overflow-hidden min-h-0">
              <div className="flex flex-col h-full p-4">
                <h3 className="font-semibold text-lg mb-3">Chat</h3>
                <ScrollArea className="flex-1 mb-3">
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <div className="bg-muted px-4 py-2 rounded-full text-sm">
                        You matched with {matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Unknown User'}!
                      </div>
                    </div>
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} gap-2 items-end`}>
                        {!msg.isMe && (
                          <Avatar className="h-8 w-8 mb-5 flex-shrink-0">
                            <AvatarImage src={matchedUser?.profilePicture} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {matchedUser?.firstName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="flex flex-col gap-1 max-w-[70%]">
                          <div className={`relative px-4 py-2 ${
                            msg.isMe 
                              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm' 
                              : 'bg-muted text-foreground rounded-2xl rounded-bl-sm'
                          }`}>
                            <p className="text-sm break-words">{msg.text}</p>
                          </div>
                          <span className={`text-xs text-muted-foreground ${
                            msg.isMe ? 'text-right' : 'text-left'
                          }`}>
                            {msg.timestamp.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        </div>

                        {msg.isMe && (
                          <Avatar className="h-8 w-8 mb-5 flex-shrink-0">
                            <AvatarImage src={profileData?.profilePicture} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                              You
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-destructive hover:bg-destructive/90 shrink-0"
                    onClick={() => setShowEndConfirm(true)}
                  >
                    <PhoneOff className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="rounded-full"
                  />
                  <Button size="icon" onClick={handleSend} className="rounded-full bg-gradient-primary hover:opacity-90 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - User Info */}
          <div className="flex-1 bg-card rounded-3xl border border-border shadow-apple-md overflow-hidden min-h-0">
            <ScrollArea className="h-full">
              <CorrespondentProfile matchedUser={matchedUser} isConnected={isConnected} />
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Profile Modal for Mobile */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-[92%] max-h-[85vh] rounded-3xl p-0 overflow-hidden">
          <ScrollArea className="h-[85vh] p-6">
            <CorrespondentProfile matchedUser={matchedUser} isConnected={isConnected} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* End Call Confirmation Dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="max-w-sm mx-auto rounded-3xl w-[calc(100vw-2rem)] md:w-auto">
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

      {/* End Call Confirmation Modal */}
      <EndCallModal
        open={showEndCallModal}
        onConfirm={handleEndCallConfirm}
        onCancel={handleEndCallCancel}
      />

      {/* Reconnecting Overlay */}
      <ReconnectingOverlay
        show={isReconnecting}
        userName={matchedUser?.firstName || 'User'}
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
