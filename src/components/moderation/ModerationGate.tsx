import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCircle } from '@/contexts/CircleContext';
import { acknowledgeModeration, isBanned, isRestrictionActive } from '@/lib/api/moderation';
import { WarningModal } from './WarningModal';
import { RestrictionModal } from './RestrictionModal';
import { BanModal } from './BanModal';

/**
 * Global moderation overlay, mounted once inside CircleProvider so it covers
 * desktop Home, MobileHome, and direct navigation. Picks the modal to show from
 * the current user's moderation state:
 *   - banned                          → BanModal (always, forced)
 *   - restricted (active) & unacked    → RestrictionModal (forced, countdown)
 *   - warned & unacked                 → WarningModal (dismissible)
 */
export function ModerationGate() {
  const { circle, circleId, moderation, reloadModeration } = useCircle();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const circleName = circle?.name;

  const handleAcknowledge = async () => {
    if (circleId) {
      try {
        await acknowledgeModeration(circleId);
      } catch (error) {
        console.error('Failed to acknowledge moderation:', error);
      }
    }
    await reloadModeration();
  };

  const handleExit = async () => {
    try {
      await signOut();
    } finally {
      navigate('/auth');
    }
  };

  // No user (e.g. right after the ban modal's "Leave Circle" signs out) → show
  // nothing. The ban modal reappears on the banned user's next login.
  if (!user) return null;

  if (isBanned(moderation)) {
    return <BanModal open moderation={moderation} circleName={circleName} onExit={handleExit} />;
  }

  if (isRestrictionActive(moderation) && !moderation.acknowledgedAt) {
    return (
      <RestrictionModal
        open
        moderation={moderation}
        circleName={circleName}
        onAcknowledge={handleAcknowledge}
        onExpire={reloadModeration}
      />
    );
  }

  if (moderation.state === 'warned' && !moderation.acknowledgedAt) {
    return (
      <WarningModal
        open
        moderation={moderation}
        circleName={circleName}
        onAcknowledge={handleAcknowledge}
      />
    );
  }

  return null;
}
