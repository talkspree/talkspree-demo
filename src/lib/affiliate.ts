/**
 * Pending affiliate context — what the app remembers between an unauthenticated
 * user clicking an affiliate link (or pasting it into the demo invite gate)
 * and that user finishing signup. Survives page reloads and the Google OAuth
 * round-trip via localStorage with a 7-day TTL.
 */

const STORAGE_KEY = 'pendingAffiliate';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PendingAffiliate {
  inviterId: string;
  inviterFirstName: string;
  inviterLastName: string;
  inviterPicture: string | null;
  inviterSlug: string;
  circleId: string;
  circleAbbrev: string;
  /** Unix ms when this entry should be considered stale and ignored. */
  expiresAt: number;
}

export type PendingAffiliateInput = Omit<PendingAffiliate, 'expiresAt'>;

export function setPendingAffiliate(payload: PendingAffiliateInput): void {
  try {
    const record: PendingAffiliate = { ...payload, expiresAt: Date.now() + TTL_MS };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.warn('setPendingAffiliate failed:', err);
  }
}

export function getPendingAffiliate(): PendingAffiliate | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PendingAffiliate;
    if (
      !parsed ||
      typeof parsed.inviterId !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      clearPendingAffiliate();
      return null;
    }

    if (parsed.expiresAt < Date.now()) {
      clearPendingAffiliate();
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('getPendingAffiliate failed:', err);
    return null;
  }
}

export function clearPendingAffiliate(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('clearPendingAffiliate failed:', err);
  }
}
