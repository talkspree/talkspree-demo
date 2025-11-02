import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Question, TopicPreset, getRandomQuestion, topicPresets } from '@/data/questions';

interface PromptDisplayProps {
  preset?: TopicPreset;
  onRequestTopicChange?: () => void;
  className?: string;
}

export function PromptDisplay({ 
  preset = topicPresets[0],
  onRequestTopicChange,
  className = '' 
}: PromptDisplayProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question>(getRandomQuestion(preset));
  const [nextQuestionIn, setNextQuestionIn] = useState(180);
  const [smallTalkTimer, setSmallTalkTimer] = useState(60);
  const [showSmallTalk, setShowSmallTalk] = useState(true);

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
            setCurrentQuestion(getRandomQuestion(preset));
            return 180;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [preset, showSmallTalk]);

  const handleRefresh = () => {
    setCurrentQuestion(getRandomQuestion(preset));
    setNextQuestionIn(180);
    if (onRequestTopicChange) {
      onRequestTopicChange();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs.toString().padStart(2, '0')}s`;
  };

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
              "{currentQuestion.text}"
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
            <span>next question in {formatTime(nextQuestionIn)} • </span>
            <span className="font-medium">*From {currentQuestion.topic}*</span>
          </div>
        </>
      )}
    </div>
  );
}
