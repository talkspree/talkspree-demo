import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { ModerationModalShell } from './ModerationModalShell';
import { Moderation } from '@/lib/api/moderation';

interface WarningModalProps {
  open: boolean;
  moderation: Moderation;
  circleName?: string;
  /** Marks the warning acknowledged (so it won't re-show) and reloads state. */
  onAcknowledge: () => void;
}

export function WarningModal({ open, moderation, circleName, onAcknowledge }: WarningModalProps) {
  const reason = moderation.reason ? moderation.reason.toLowerCase() : 'a community guideline violation';

  return (
    <ModerationModalShell
      open={open}
      // Dismissing the warning (X / button) counts as acknowledgement so it shows only once.
      onOpenChange={(o) => { if (!o) onAcknowledge(); }}
      tone="warning"
      icon={<AlertTriangle className="h-6 w-6" />}
      title="Official Warning"
      description={
        <>You have recently been reported in {circleName ?? 'this circle'} for <strong className="text-foreground">{reason}</strong>.</>
      }
      footer={<Button className="w-full" onClick={onAcknowledge}>I Understand</Button>}
    >
      {moderation.message && (
        <p className="mb-3 rounded-lg bg-muted/60 p-3 text-foreground/90">{moderation.message}</p>
      )}
      <p className="font-medium text-foreground mb-2">What this means:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Your account is currently in good standing.</li>
        <li>
          If we receive another similar report, you will be{' '}
          <strong className="text-foreground">permanently banned</strong> from this circle.
        </li>
        <li>Please review our community guidelines to avoid further issues.</li>
      </ul>
    </ModerationModalShell>
  );
}
