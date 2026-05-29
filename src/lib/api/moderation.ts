import { supabase } from '@/lib/supabase';

/**
 * Community moderation (Warn / Restrict / Ban) — see migration 090.
 * Moderation state lives on the user's circle_members row, separate from the
 * membership `status` so a warning stays non-blocking. All reads/writes go
 * through SECURITY DEFINER RPCs; users can never lift their own punishment.
 */

export type ModerationState = 'none' | 'warned' | 'restricted' | 'banned';

export interface Moderation {
  state: ModerationState;
  reason: string | null;
  message: string | null;
  /** ISO timestamp — restriction end. Null for warn/ban/none. */
  expiresAt: string | null;
  /** ISO timestamp — when the user acknowledged the entry modal. Null ⇒ still pending. */
  acknowledgedAt: string | null;
}

export const NO_MODERATION: Moderation = {
  state: 'none',
  reason: null,
  message: null,
  expiresAt: null,
  acknowledgedAt: null,
};

/**
 * Fetch the current user's effective moderation state for a circle.
 * The RPC also lazily lifts expired restrictions server-side.
 */
export async function getMyModeration(circleId: string | null): Promise<Moderation> {
  if (!circleId) return NO_MODERATION;

  const { data, error } = await supabase.rpc('get_my_circle_moderation', {
    p_circle_id: circleId,
  });

  if (error) {
    console.error('getMyModeration error:', error);
    return NO_MODERATION;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return NO_MODERATION;

  return {
    state: (row.moderation_state as ModerationState) ?? 'none',
    reason: row.moderation_reason ?? null,
    message: row.moderation_message ?? null,
    expiresAt: row.moderation_expires_at ?? null,
    acknowledgedAt: row.moderation_acknowledged_at ?? null,
  };
}

/** Mark the current user's active warning/restriction modal as acknowledged. */
export async function acknowledgeModeration(circleId: string): Promise<void> {
  const { error } = await supabase.rpc('acknowledge_circle_moderation', {
    p_circle_id: circleId,
  });
  if (error) throw error;
}

/** Restriction currently in effect (restricted AND not yet expired). */
export function isRestrictionActive(m: Moderation): boolean {
  return (
    m.state === 'restricted' &&
    !!m.expiresAt &&
    new Date(m.expiresAt).getTime() > Date.now()
  );
}

export function isBanned(m: Moderation): boolean {
  return m.state === 'banned';
}

/** Should the user be blocked from participating (START / matchmaking)? */
export function isParticipationBlocked(m: Moderation): boolean {
  return isBanned(m) || isRestrictionActive(m);
}
