import { ReactElement } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDevice } from '@/hooks/useDevice';

interface HoverHintProps {
  /** Hint text. When empty/null, children render unchanged (no hint). */
  content?: string | null;
  /** A single interactive element (e.g. a Badge). */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Wraps a single element with a description hint.
 * - Desktop only: Radix tooltip shown on hover (requires a TooltipProvider ancestor).
 * - Mobile / tablet: no hint rendered — hints are desktop-only.
 */
export function HoverHint({ content, children, side = 'top' }: HoverHintProps) {
  const device = useDevice();

  if (!content || device !== 'desktop') return children;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align="center" className="max-w-64 text-sm p-3">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
