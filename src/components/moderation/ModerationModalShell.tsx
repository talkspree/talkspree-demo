import * as React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Tone = 'warning' | 'restriction' | 'ban';

const TONE: Record<Tone, string> = {
  warning: 'bg-warning/10 text-warning',
  restriction: 'bg-warning/15 text-warning',
  ban: 'bg-destructive/10 text-destructive',
};

interface ModerationModalShellProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Forced modals can't be closed by Escape, outside-click, or the X. */
  forced?: boolean;
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
  footer: React.ReactNode;
}

/**
 * Shared presentational shell for the moderation modals, styled to match the
 * app (shadcn Dialog, app tokens, rounded-2xl). Adapts the Downloads mockups.
 */
export function ModerationModalShell({
  open,
  onOpenChange,
  forced = false,
  tone,
  icon,
  title,
  description,
  children,
  footer,
}: ModerationModalShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('sm:max-w-[420px] rounded-2xl', forced && '[&>button]:hidden')}
        onInteractOutside={forced ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={forced ? (e) => e.preventDefault() : undefined}
      >
        <div className="flex flex-col items-center text-center">
          <div className={cn('h-12 w-12 rounded-full flex items-center justify-center mb-4', TONE[tone])}>
            {icon}
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </div>

        {children && <div className="mt-1 text-left text-sm text-muted-foreground">{children}</div>}

        <div className="mt-4">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}
