import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBorderCardProps {
  children: React.ReactNode;
  className?: string;
  isAnimated?: boolean;
  onClick?: () => void;
}

export const AnimatedBorderCard: React.FC<AnimatedBorderCardProps> = ({
  children,
  className = "",
  isAnimated = false,
  onClick,
}) => {
  return (
    <div 
      className={cn("relative", className)}
      onClick={onClick}
    >
      {/* The outer container defines the shape with overflow-hidden */}
      <div className="relative overflow-hidden rounded-3xl p-[3px] shadow-apple-md bg-card hover:shadow-apple-md transition-all duration-200">
        
        {/* The Gradient Layer (The Border Animation) - Only visible when isAnimated is true */}
        {isAnimated && (
          <div 
            className="absolute inset-[-1000%] z-0 animate-[spin_3s_linear_infinite]"
            style={{
              background: `conic-gradient(
                transparent 0deg, 
                hsl(var(--primary)) 40deg, 
                transparent 80deg, 
                transparent 180deg, 
                hsl(var(--primary-glow)) 220deg, 
                transparent 260deg
              )`,
            }}
          />
        )}

        {/* Static gradient for non-animated state */}
        {!isAnimated && (
          <div 
            className="absolute inset-[-1000%] z-0"
            style={{
              background: `linear-gradient(135deg, hsl(var(--border)), hsl(var(--border)))`
            }}
          />
        )}

        {/* The inner content container */}
        <div className="relative z-10 h-full w-full rounded-[calc(1.5rem-3px)] bg-card">
          {children}
        </div>
      </div>
    </div>
  );
};
