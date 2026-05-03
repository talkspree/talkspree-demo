import { supabase } from '@/lib/supabase';

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
