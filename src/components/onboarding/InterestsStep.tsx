import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InterestSelector } from './InterestSelector';
import { OnboardingData } from '@/pages/Onboarding';

interface InterestsStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function InterestsStep({ data, updateData, onNext, onPrev }: InterestsStepProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(data.interests);

  const handleNext = () => {
    updateData({ interests: selectedInterests });
    onNext();
  };

  const isValid = selectedInterests.length >= 5;
  
  const getButtonText = () => {
    const count = selectedInterests.length;
    if (count < 5) {
      return `${count}/5`;
    }
    return 'Continue';
  };
  
  const getCounterText = () => {
    const count = selectedInterests.length;
    if (count >= 5) {
      return `${count}/20`;
    }
    return null;
  };

  return (
    <Card className="glass shadow-apple-lg max-w-4xl mx-auto md:h-auto h-[85vh] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-3xl md:text-3xl text-2xl font-medium">What are you interested in?</CardTitle>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Select at least 5 interests to help us match you with like-minded people.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 flex flex-col overflow-hidden">
        <InterestSelector
          selectedInterests={selectedInterests}
          onInterestsChange={setSelectedInterests}
          className="flex-1"
        />

        <div className="flex gap-3 pt-4 flex-shrink-0">
          <Button variant="outline" onClick={onPrev} className="transition-spring">
            Back
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!isValid}
            className="flex-1 bg-gradient-primary hover:shadow-glow transition-spring relative"
          >
            {getButtonText()}
            {getCounterText() && (
              <span className="ml-2 text-xs opacity-75">{getCounterText()}</span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}