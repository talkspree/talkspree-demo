import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { interests, interestCategories, getInterestsByCategory, Interest } from '@/data/interests';
import { cn } from '@/lib/utils';

interface InterestSelectorProps {
  selectedInterests: string[];
  onInterestsChange: (interests: string[]) => void;
  className?: string;
}

export function InterestSelector({ selectedInterests, onInterestsChange, className }: InterestSelectorProps) {
  const toggleInterest = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      onInterestsChange(selectedInterests.filter(id => id !== interestId));
    } else if (selectedInterests.length < 20) {
      onInterestsChange([...selectedInterests, interestId]);
    }
  };

  const isSelected = (interestId: string) => selectedInterests.includes(interestId);
  const canSelect = selectedInterests.length < 20;
  const hasMinimum = selectedInterests.length >= 5;

  const getButtonText = () => {
    if (selectedInterests.length < 5) {
      return `Select ${5 - selectedInterests.length} more`;
    }
    return `${selectedInterests.length}/20`;
  };

  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      {/* All interests in scrollable view */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
        {interestCategories.map((category) => (
          <div key={category} className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground sticky top-0 bg-background py-2 z-10">
              {category}
            </h3>
            <div className="flex flex-wrap gap-2">
              {getInterestsByCategory(category).map((interest) => (
                <Badge
                  key={interest.id}
                  variant={isSelected(interest.id) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-spring text-sm py-2 px-3 shadow-apple-sm",
                    isSelected(interest.id) 
                      ? "bg-gradient-primary hover:shadow-glow text-primary-foreground" 
                      : "hover:bg-accent hover:shadow-apple-md",
                    !canSelect && !isSelected(interest.id) && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (canSelect || isSelected(interest.id)) {
                      toggleInterest(interest.id);
                    }
                  }}
                >
                  <span className="mr-2">{interest.emoji}</span>
                  {interest.name}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}