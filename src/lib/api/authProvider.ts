import { supabase } from '@/lib/supabase';

export type AuthProvider = 'email' | 'google' | 'unknown';

/**
 * Look up which sign-in provider an account uses, by email. Used on the
 * forgot-password page to detect Google accounts before sending a reset
 * email they could never use. Returns 'unknown' if the email isn't
 * registered or if anything goes wrong — callers must not treat this as
 * confirmation of non-existence.
 */
export async function lookupAuthProvider(email: string): Promise<AuthProvider> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 'unknown';

  try {
    const { data, error } = await supabase.functions.invoke<{ provider: AuthProvider }>(
      'auth-provider-lookup',
      { body: { email: normalized } },
    );
    if (error || !data?.provider) return 'unknown';
    if (data.provider === 'email' || data.provider === 'google') return data.provider;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
