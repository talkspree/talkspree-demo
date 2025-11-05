import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, FlipHorizontal, MessageSquare, PhoneOff, RefreshCw, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useVideoStream } from '@/hooks/useVideoStream';
import { useCallTimer } from '@/hooks/useCallTimer';
import { Question, getRandomQuestion, topicPresets } from '@/data/questions';
import { CorrespondentProfile } from './CorrespondentProfile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { SampleUser, sampleUserManager } from '@/data/sampleUsers';

export function MobileCall() {
  const navigate = useNavigate();
  const location = useLocation();
  const matchedUser = location.state?.matchedUser as SampleUser | undefined;
  const [isConnected, setIsConnected] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question>(getRandomQuestion(topicPresets[0]));
  const [nextQuestionIn, setNextQuestionIn] = useState(180);
  const [inputValue, setInputValue] = useState('');
  const [extendRequestVisible, setExtendRequestVisible] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, text: string, sender: string}>>([]);
  const [smallTalkTimer, setSmallTalkTimer] = useState(60);
  const [showSmallTalk, setShowSmallTalk] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Get duration from navigation state, default to 15 minutes
  const sessionDuration = location.state?.duration || 15;
  const durationInSeconds = sessionDuration === 0 ? 999999 : sessionDuration * 60;

  const {
    stream,
    cameraEnabled,
    micEnabled,
    toggleCamera,
    toggleMic,
    flipCamera
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

  useEffect(() => {
    console.log('📹 Stream effect triggered:', !!stream);
    if (stream) {
      console.log('📹 Attaching stream to video elements');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.error('❌ Main video play error:', err);
        });
        console.log('✅ Main video attached');
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(err => {
          console.error('❌ Local video play error:', err);
        });
        console.log('✅ Local video attached');
      }
    }
  }, [stream]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (showSmallTalk) {
        setSmallTalkTimer(prev => {
          if (prev <= 1) {
            setShowSmallTalk(false);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setNextQuestionIn(prev => {
          if (prev <= 1) {
            setCurrentQuestion(getRandomQuestion(topicPresets[0]));
            return 180;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [showSmallTalk]);

  useEffect(() => {
    if (showExtendPrompt) {
      setExtendRequestVisible(true);
    }
  }, [showExtendPrompt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs.toString().padStart(2, '0')}s`;
  };

  const handleExtendAccept = () => {
    extendCall();
    setExtendRequestVisible(false);
  };

  const handleExtendDecline = () => {
    declineExtend();
    setExtendRequestVisible(false);
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      setMessages([...messages, { id: Date.now().toString(), text: inputValue, sender: 'You' }]);
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
      // Try native vibration API if available
      if ('vibrate' in navigator) {
        const duration = intensity === 'light' ? 10 : intensity === 'medium' ? 20 : 30;
        navigator.vibrate(duration);
      }
    } catch (error) {
      // Haptics not available on this device
      console.log('Haptics not available');
    }
  };

  const handleButtonClick = (action: () => void, hapticIntensity: 'light' | 'medium' | 'heavy' = 'light') => {
    triggerHaptic(hapticIntensity);
    action();
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Mobile View (default) */}
      <div className="md:hidden h-screen flex flex-col">
        {/* Fullscreen Video Background */}
        {cameraEnabled && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!cameraEnabled && (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-2">👤</div>
              <p className="text-muted-foreground">Camera Off</p>
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
                    "{currentQuestion.text}"
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 hover:bg-white/20 text-white"
                    onClick={() => {
                      handleButtonClick(() => setCurrentQuestion(getRandomQuestion(topicPresets[0])));
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 text-xs text-white/80">
                  <span>Next in {formatTime(nextQuestionIn)} • </span>
                  <span className="font-medium">*{currentQuestion.topic}*</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Extend Call Notification */}
        {extendRequestVisible && (
          <div className="absolute top-28 left-4 right-4 z-30 animate-fade-in">
            <div className="bg-card/95 backdrop-blur-md rounded-3xl p-4 shadow-apple-lg border border-border flex items-center justify-between">
              <span className="text-foreground font-medium text-sm">Call ends in 2 minutes</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-success hover:bg-success/90 text-white rounded-full px-4"
                  onClick={() => handleButtonClick(handleExtendAccept, 'medium')}
                >
                  Extend
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full w-8 h-8 p-0 hover:bg-destructive/10"
                  onClick={() => handleButtonClick(handleExtendDecline, 'light')}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Local Video Overlay - Rounded Bottom */}
        <div className="absolute bottom-44 left-6 z-10">
          <div className="w-28 h-40 rounded-[32px] overflow-hidden border-2 border-white/90 shadow-apple-lg">
            {cameraEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
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
              variant={cameraEnabled ? "ghost" : "destructive"}
              className="h-12 w-12 rounded-full hover:bg-accent"
              onClick={() => handleButtonClick(toggleCamera, 'medium')}
            >
              {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button
              size="icon"
              variant={micEnabled ? "ghost" : "destructive"}
              className="h-12 w-12 rounded-full hover:bg-accent"
              onClick={() => handleButtonClick(toggleMic, 'medium')}
            >
              {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12 rounded-full hover:bg-accent"
              onClick={() => handleButtonClick(flipCamera)}
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
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender === 'You' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm">{msg.text}</p>
                          </div>
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
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
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
            {cameraEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
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
                variant={cameraEnabled ? "secondary" : "destructive"}
                className="h-9 w-9 rounded-full"
                onClick={() => handleButtonClick(toggleCamera, 'medium')}
              >
                {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant={micEnabled ? "secondary" : "destructive"}
                className="h-9 w-9 rounded-full"
                onClick={() => handleButtonClick(toggleMic, 'medium')}
              >
                {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
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
                  "{currentQuestion.text}"
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 hover:bg-white/20 text-white"
                  onClick={() => setCurrentQuestion(getRandomQuestion(topicPresets[0]))}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 text-xs text-white/80">
                <span>Next in {formatTime(nextQuestionIn)} • </span>
                <span className="font-medium">*{currentQuestion.topic}*</span>
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
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender === 'You' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <p className="text-sm">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-destructive hover:bg-destructive/90 shrink-0"
                    onClick={() => navigate('/wrap-up', { 
                      state: { 
                        matchedUser,
                        ...location.state
                      },
                      replace: true 
                    })}
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
    </div>
  );
}
