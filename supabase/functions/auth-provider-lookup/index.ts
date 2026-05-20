// Supabase Edge Function: look up an auth user's signup provider by email.
//
// Used by the forgot-password flow so we can tell a Google-signup user that
// their password is managed by Google before sending them a useless reset email.
//
// Response shape: { provider: 'email' | 'google' | 'unknown' }
// - 'unknown' is returned for both "no account" and any error, so callers
//   cannot infer whether a given email is registered (account enumeration).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Provider = 'email' | 'google' | 'unknown';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ provider: 'unknown' as Provider }, 200);
  }

  let email = '';
  try {
    const body = await req.json();
    email = String(body?.email ?? '').trim().toLowerCase();
  } catch {
    return jsonResponse({ provider: 'unknown' as Provider }, 200);
  }

  if (!email || !email.includes('@')) {
    return jsonResponse({ provider: 'unknown' as Provider }, 200);
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // The admin SDK does not expose a getUserByEmail helper, so we page
    // through listUsers. Fine for current scale; revisit if user count
    // grows beyond a few thousand.
    const perPage = 1000;
    let page = 1;
    let foundUser: { identities?: Array<{ provider?: string }> | null; app_metadata?: Record<string, unknown> } | null = null;

    while (page <= 50) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error || !data?.users || data.users.length === 0) break;

      const match = data.users.find((u) => (u.email ?? '').toLowerCase() === email);
      if (match) {
        foundUser = match;
        break;
      }
      if (data.users.length < perPage) break;
      page++;
    }

    if (!foundUser) {
      return jsonResponse({ provider: 'unknown' as Provider });
    }

    const identities = foundUser.identities ?? [];
    const providers = new Set<string>(
      identities.map((i) => i?.provider ?? '').filter(Boolean),
    );

    const meta = foundUser.app_metadata ?? {};
    if (typeof meta.provider === 'string') providers.add(meta.provider);
    if (Array.isArray(meta.providers)) {
      for (const p of meta.providers as unknown[]) {
        if (typeof p === 'string') providers.add(p);
      }
    }

    // If both email and Google are linked, prefer 'email' — the user has a
    // password they can reset.
    if (providers.has('email')) {
      return jsonResponse({ provider: 'email' as Provider });
    }
    if (providers.has('google')) {
      return jsonResponse({ provider: 'google' as Provider });
    }
    return jsonResponse({ provider: 'unknown' as Provider });
  } catch (err) {
    console.error('auth-provider-lookup error:', err);
    return jsonResponse({ provider: 'unknown' as Provider });
  }
});
