import { useState } from 'react';
import { useCircle } from '@/contexts/CircleContext';
import { WelcomeCircleStep } from '@/components/onboarding/WelcomeCircleStep';
import { RoleSelectionStep } from '@/components/onboarding/RoleSelectionStep';
import { updateMyCircleRole } from '@/lib/api/circles';

interface PostJoinOverlayProps {
  /** Called once the user has been welcomed and has picked (and saved) a role. */
  onDone: () => void;
}

/**
 * Shown over the circle homepage right after a user joins a circle from the hub:
 * "Welcome to <circle>" → pick a role → saved → reveal the homepage. Reuses the
 * onboarding Welcome + Role steps. Reads the active circle from context (the
 * route has already hydrated it before this overlay mounts).
 */
export function PostJoinOverlay({ onDone }: PostJoinOverlayProps) {
  const { circle, reloadRole } = useCircle();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleRole = async (roleId: string) => {
    if (!circle) return;
    setSaving(true);
    setError('');
    try {
      const formatted = roleId.charAt(0).toUpperCase() + roleId.slice(1);
      await updateMyCircleRole(circle.id, formatted);
      await reloadRole();
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Could not save your role. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl">
        {step === 1 ? (
          <WelcomeCircleStep circle={circle} onNext={() => setStep(2)} />
        ) : (
          <>
            <RoleSelectionStep onComplete={handleRole} />
            {saving && <p className="text-center text-sm text-muted-foreground mt-4">Saving…</p>}
            {error && <p className="text-center text-sm text-destructive mt-4">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
