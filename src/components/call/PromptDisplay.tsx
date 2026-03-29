import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSharedPrompt } from '@/hooks/useSharedPrompt';

const SMALL_TALK_DURATION = 60;

function computeSmallTalkRemaining(callStartTime?: string | null): number {
  if (!callStartTime) return SMALL_TALK_DURATION;
  const elapsed = Math.floor((Date.now() - new Date(callStartTime).getTime()) / 1000);
  return Math.max(0, SMALL_TALK_DURATION - elapsed);
}

interface PromptDisplayProps {
  callId?: string;
  callStartTime?: string | null;
  topic?: string;
  customTopics?: string[];
  customQuestions?: string[];
  onRequestTopicChange?: () => void;
  className?: string;
}

export function PromptDisplay({
  callId,
  callStartTime,
  topic,
  customTopics,
  customQuestions,
  onRequestTopicChange,
  className = '',
}: PromptDisplayProps) {
  const initialRemaining = computeSmallTalkRemaining(callStartTime);
  const [smallTalkTimer, setSmallTalkTimer] = useState(initialRemaining);
  const [showSmallTalk, setShowSmallTalk] = useState(initialRemaining > 0);

  // Recalculate small talk timer if callStartTime arrives late (e.g. from recovery)
  useEffect(() => {
    if (!callStartTime) return;
    const remaining = computeSmallTalkRemaining(callStartTime);
    setSmallTalkTimer(remaining);
    setShowSmallTalk(remaining > 0);
  }, [callStartTime]);

  // Don't pass selection - hook will load from database (source of truth)
  // Only pass selection if there's no callId (local-only mode)
  const { currentQuestion, nextQuestionIn, refreshPrompt, preset } = useSharedPrompt(
    callId,
    !callId ? { topicKey: topic, customTopics, customQuestions } : undefined
  );

  useEffect(() => {
    if (!showSmallTalk) return;
    const interval = setInterval(() => {
      setSmallTalkTimer((prev) => {
        if (prev <= 1) {
          setShowSmallTalk(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showSmallTalk]);

  const handleRefresh = async () => {
    await refreshPrompt();
    if (onRequestTopicChange) {
      onRequestTopicChange();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs.toString().padStart(2, '0')}s`;
  };

  const questionText = currentQuestion?.text || 'Loading prompt...';
  const topicText = currentQuestion?.topic || preset.name;

  return (
    <div className={`bg-gradient-primary rounded-3xl px-6 py-5 shadow-apple-lg ${className}`}>
      {showSmallTalk ? (
        <div className="text-center">
          <p className="text-3xl font-bold text-white mb-1">{smallTalkTimer}s</p>
          <p className="text-base text-white/90">for Small-Talk!</p>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-white flex-1 leading-relaxed">
              "{questionText}"
            </h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              className="h-10 w-10 shrink-0 hover:bg-white/20 text-white"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="mt-3 text-sm text-white/80">
            <span>Next question in {formatTime(nextQuestionIn)} • </span>
            <span className="font-medium">*From {topicText}*</span>
          </div>
        </>
      )}
    </div>
  );
}
