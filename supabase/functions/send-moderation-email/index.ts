// Supabase Edge Function: send the ban-notification email for community moderation.
//
// Invoked by the admin manager after apply_circle_moderation('ban') succeeds.
// Security: requires a valid JWT (verify_jwt) AND verifies the *invoker* is a
// super admin or an admin of the target circle before sending — so a regular
// authenticated user cannot spam "you've been banned" emails at arbitrary users.
//
// Sends via custom SMTP (Brevo) using denomailer. Secrets required:
//   SMTP_HOST (e.g. smtp-relay.brevo.com), SMTP_PORT (587), SMTP_USER,
//   SMTP_PASS, SMTP_FROM (verified sender, e.g. "TalkSpree <no-reply@yourdomain>").
// Plus the standard SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPER_ADMIN_EMAILS = ['talkspree.app@gmail.com', 'mihail.hummel@gmail.com'];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // --- Parse input ---
  let userId = '';
  let circleId = '';
  let reason: string | null = null;
  let message: string | null = null;
  try {
    const body = await req.json();
    userId = String(body?.user_id ?? '');
    circleId = String(body?.circle_id ?? '');
    reason = body?.reason ? String(body.reason) : null;
    message = body?.message ? String(body.message) : null;
  } catch {
    return jsonResponse({ error: 'Invalid body' }, 400);
  }
  if (!userId || !circleId) return jsonResponse({ error: 'Missing user_id or circle_id' }, 400);

  try {
    // --- Authorize the invoker (validate the bearer token explicitly) ---
    // NOTE: getUser() with no arg reads a stored session (none exists in an edge
    // function) → always null → 401. We must pass the JWT from the header.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const callerEmail = (caller.email ?? '').toLowerCase();
    let authorized = SUPER_ADMIN_EMAILS.includes(callerEmail);
    if (!authorized) {
      const { data: pa } = await admin
        .from('platform_admins')
        .select('admin_type')
        .eq('user_id', caller.id)
        .eq('admin_type', 'super_admin')
        .maybeSingle();
      authorized = !!pa;
    }
    if (!authorized) {
      const { data: cm } = await admin
        .from('circle_members')
        .select('admin_type')
        .eq('user_id', caller.id)
        .eq('circle_id', circleId)
        .maybeSingle();
      authorized = !!cm && (cm.admin_type === 'creator' || cm.admin_type === 'circle_admin');
    }
    if (!authorized) return jsonResponse({ error: 'Forbidden' }, 403);

    // --- Look up target email + circle name (service role) ---
    const { data: targetData, error: targetErr } = await admin.auth.admin.getUserById(userId);
    const toEmail = targetData?.user?.email;
    if (targetErr || !toEmail) return jsonResponse({ error: 'Target user has no email' }, 422);

    const { data: circle } = await admin.from('circles').select('name').eq('id', circleId).maybeSingle();
    const circleName = circle?.name || 'the circle';

    // --- Compose ---
    const subject = `You have been banned from ${circleName}`;
    const reasonLine = reason ? `Reason: ${reason}` : '';
    const adminNote = message ? `\n\nNote from the moderators:\n${message}` : '';
    const text =
      `Hello,\n\n` +
      `Your account has been permanently banned from ${circleName} on TalkSpree.\n` +
      `${reasonLine}\n\n` +
      `Following prior warnings, your account continued to violate our community standards. ` +
      `You are now permanently prohibited from viewing or interacting with this circle. ` +
      `This decision is final and cannot be appealed.${adminNote}\n\n` +
      `— The TalkSpree Team`;

    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;line-height:1.6">` +
      `<h2 style="color:#dc2626;margin:0 0 12px">You have been banned from ${escapeHtml(circleName)}</h2>` +
      `<p>Your account has been <strong>permanently banned</strong> from ${escapeHtml(circleName)} on TalkSpree.</p>` +
      (reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : '') +
      `<p>Following prior warnings, your account continued to violate our community standards. ` +
      `You are now permanently prohibited from viewing or interacting with this circle. ` +
      `This decision is final and cannot be appealed.</p>` +
      (message ? `<p style="background:#f1f5f9;padding:12px;border-radius:8px"><strong>Note from the moderators:</strong><br/>${escapeHtml(message)}</p>` : '') +
      `<p style="color:#64748b">— The TalkSpree Team</p>` +
      `</div>`;

    // --- Send via SMTP (Brevo) ---
    const port = Number(Deno.env.get('SMTP_PORT') ?? '587');
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get('SMTP_HOST') ?? '',
        port,
        // Port 465 = implicit TLS; 587 = STARTTLS (denomailer upgrades when tls=false).
        tls: port === 465,
        auth: {
          username: Deno.env.get('SMTP_USER') ?? '',
          password: Deno.env.get('SMTP_PASS') ?? '',
        },
      },
    });

    await client.send({
      from: Deno.env.get('SMTP_FROM') ?? '',
      to: toEmail,
      subject,
      content: text,
      html,
    });
    await client.close();

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('send-moderation-email error:', err);
    return jsonResponse({ error: (err as Error)?.message || 'Failed to send email' }, 500);
  }
});
