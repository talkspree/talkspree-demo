import { supabase } from '@/lib/supabase';
import { getPendingAffiliate } from '@/lib/affiliate';

export interface InviterInfo {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  slug: string;
}

export interface CircleAbbrInfo {
  id: string;
  name: string;
  abbreviation: string;
}

/**
 * Public lookup of an inviter by their unique slug. Calls the
 * `get_inviter_by_slug` security-definer RPC so we don't have to widen the
 * `profiles` RLS policy just to render the "Invited by" banner pre-login.
 */
export async function getInviterBySlug(slug: string): Promise<InviterInfo | null> {
  const normalised = slug.trim().toLowerCase();
  if (!/^[a-z0-9]{6}$/.test(normalised)) return null;

  const { data, error } = await supabase.rpc('get_inviter_by_slug', { p_slug: normalised });

  if (error) {
    console.error('getInviterBySlug error:', error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    id: row.id,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    profilePicture: row.profile_picture_url ?? null,
    slug: row.slug,
  };
}

/**
 * Look up a circle by its abbreviation (case-insensitive). Uses the
 * `get_circle_by_abbreviation` security-definer RPC so anonymous invitees
 * can resolve `MTY` without `circles` SELECT RLS (authenticated-only in 018).
 */
export async function getCircleByAbbreviation(abbreviation: string): Promise<CircleAbbrInfo | null> {
  const normalised = abbreviation.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(normalised)) return null;

  const { data, error } = await supabase.rpc('get_circle_by_abbreviation', {
    p_abbrev: normalised,
  });

  if (error) {
    console.error('getCircleByAbbreviation error:', error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    id: row.id,
    name: row.name ?? '',
    abbreviation: row.abbreviation ?? normalised,
  };
}

/**
 * Persist affiliate context for the currently authenticated user. Used by the
 * Google OAuth path where `raw_user_meta_data` cannot be injected at signup.
 *
 * The DB RPC enforces:
 *   - Caller must be authenticated
 *   - No self-invite
 *   - First-writer-wins (won't overwrite an existing inviter)
 */
export async function claimAffiliate(
  inviterId: string,
  circleId: string | null,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_affiliate', {
    p_inviter_id: inviterId,
    p_circle_id: circleId,
  });

  if (error) {
    console.error('claimAffiliate error:', error);
    return false;
  }

  return data === true;
}

export type ClaimPendingAffiliateOutcome =
  | 'claimed'
  | 'already-claimed'
  | 'no-stash'
  | 'failed';

/**
 * Robust recovery wrapper around `claim_affiliate` for the OAuth signup path.
 *
 * Google OAuth can't inject `raw_user_meta_data`, so the `handle_new_user` DB
 * trigger creates the profile row with NULL affiliate columns. This helper
 * applies the pending affiliate context from localStorage after the fact,
 * tolerating two race conditions:
 *
 *   - Trigger latency: the `profiles` row might not exist yet when we land in
 *     `/auth/callback`. We poll for it (up to ~3 s) before issuing the RPC.
 *   - JWT propagation: `claim_affiliate` can raise "not authenticated" or
 *     return FALSE on a transient blip. We retry once with a short delay.
 *
 * After both attempts fail, we re-SELECT `invited_by` once more: if another
 * writer (re-fired trigger, parallel tab) won the race in the meantime, that
 * counts as success — first-writer-wins is the whole point.
 *
 * The caller decides when to clear `pendingAffiliate` based on the outcome.
 */
export async function claimPendingAffiliate(
  userId: string,
): Promise<ClaimPendingAffiliateOutcome> {
  const stash = getPendingAffiliate();
  if (!stash) return 'no-stash';

  // Poll for the profile row to appear (handle_new_user trigger may still be
  // running). ~3 s total: 15 attempts × 200 ms.
  let profileRow: { id: string; invited_by: string | null } | null = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, invited_by')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      profileRow = data as { id: string; invited_by: string | null };
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // Race-won case: profile exists and someone already attributed the inviter.
  if (profileRow && profileRow.invited_by) {
    return 'already-claimed';
  }

  const inviterId = stash.inviterId;
  const circleId = stash.circleId || null;

  const tryClaim = async (): Promise<{ ok: boolean }> => {
    try {
      const ok = await claimAffiliate(inviterId, circleId);
      return { ok };
    } catch (err) {
      console.warn('claimPendingAffiliate: claim_affiliate threw:', err);
      return { ok: false };
    }
  };

  let result = await tryClaim();
  if (!result.ok) {
    await new Promise((r) => setTimeout(r, 800));
    result = await tryClaim();
  }

  if (result.ok) return 'claimed';

  // Race-reconciliation: another writer may have won between our UPDATE and
  // now. If the profile shows invited_by populated, treat as success.
  const { data: reselect } = await supabase
    .from('profiles')
    .select('invited_by')
    .eq('id', userId)
    .maybeSingle();

  if (reselect && (reselect as { invited_by: string | null }).invited_by) {
    return 'already-claimed';
  }

  return 'failed';
}
