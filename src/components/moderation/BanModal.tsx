import { Button } from '@/components/ui/button';
import { Ban } from 'lucide-react';
import { ModerationModalShell } from './ModerationModalShell';
import { Moderation } from '@/lib/api/moderation';

interface BanModalProps {
  open: boolean;
  moderation: Moderation;
  circleName?: string;
  /** Sign the user out and return them to the login screen. */
  onExit: () => void;
}

export function BanModal({ open, moderation, circleName, onExit }: BanModalProps) {
  const reason = moderation.reason
    ? moderation.reason.toLowerCase()
    : 'repeated violations of our community standards';

  return (
    <ModerationModalShell
      open={open}
      forced
      tone="ban"
      icon={<Ban className="h-6 w-6" />}
      title="Account Banned"
      description={<>Your account has been permanently banned from {circleName ?? 'this circle'}.</>}
      footer={
        <Button variant="destructive" className="w-full" onClick={onExit}>
          Leave Circle
        </Button>
      }
    >
      <p className="mb-3">
        Following prior warnings, your account continues to violate our community standards regarding{' '}
        <strong className="text-foreground">{reason}</strong>.
      </p>
      {moderation.message && (
        <p className="mb-3 rounded-lg bg-muted/60 p-3 text-foreground/90">{moderation.message}</p>
      )}
      <p>
        You are now <strong className="text-foreground">permanently prohibited</strong> from viewing or
        interacting with this circle. This decision is final and cannot be appealed.
      </p>
    </ModerationModalShell>
  );
}
