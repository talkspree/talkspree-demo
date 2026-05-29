import { useCircle } from '@/contexts/CircleContext';
import {
  isBanned as checkBanned,
  isRestrictionActive as checkRestricted,
  isParticipationBlocked,
  Moderation,
} from '@/lib/api/moderation';

/**
 * Shared moderation logic for the gate (entry modals) and the START button.
 * Centralizes the booleans so enforcement is identical everywhere.
 */
export function useModerationBlock(): {
  moderation: Moderation;
  isBanned: boolean;
  isRestrictionActive: boolean;
  /** True when the user must be stopped from participating (START / queue). */
  isBlocked: boolean;
  expiresAt: string | null;
} {
  const { moderation } = useCircle();
  return {
    moderation,
    isBanned: checkBanned(moderation),
    isRestrictionActive: checkRestricted(moderation),
    isBlocked: isParticipationBlocked(moderation),
    expiresAt: moderation.expiresAt,
  };
}
