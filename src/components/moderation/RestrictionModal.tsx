import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { ModerationModalShell } from './ModerationModalShell';
import { CountdownTimer } from './CountdownTimer';
import { Moderation } from '@/lib/api/moderation';

interface RestrictionModalProps {
  open: boolean;
  moderation: Moderation;
  circleName?: string;
  /** Entry flow: marks restriction acknowledged then closes. */
  onAcknowledge?: () => void;
  /** START-blocked flow (already acknowledged): just closes. */
  onClose?: () => void;
  /** Fired when the countdown reaches zero (so callers can reload state). */
  onExpire?: () => void;
}

export function RestrictionModal({
  open,
  moderation,
  circleName,
  onAcknowledge,
  onClose,
  onExpire,
}: RestrictionModalProps) {
  const reason = moderation.reason
    ? moderation.reason.toLowerCase()
    : 'repeated community guideline violations';

  return (
    <ModerationModalShell
      open={open}
      forced
      tone="restriction"
      icon={<AlertCircle className="h-6 w-6" />}
      title="Account Restricted"
      description={
        <>
          Your account has been receiving a high volume of reports and has been temporarily
          restricted from {circleName ?? 'this circle'}.
        </>
      }
      footer={
        onAcknowledge ? (
          <Button variant="outline" className="w-full" onClick={onAcknowledge}>
            Acknowledge Restriction
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={onClose}>
            Back
          </Button>
        )
      }
    >
      <p>
        Your participation is paused due to <strong className="text-foreground">{reason}</strong>.
      </p>
      {moderation.message && (
        <p className="mt-3 rounded-lg bg-muted/60 p-3 text-foreground/90">{moderation.message}</p>
      )}
      {moderation.expiresAt && (
        <CountdownTimer expiresAt={moderation.expiresAt} onExpire={onExpire} />
      )}
    </ModerationModalShell>
  );
}
