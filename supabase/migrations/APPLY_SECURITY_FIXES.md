# Applying the security fixes (081–086)

Your Supabase MCP server runs with `--read-only` and the Supabase CLI is not
installed, so these changes must be applied by you. Easiest path: the **Supabase
Dashboard → SQL Editor** (paste each migration), plus **Edge Functions** for the
two Agora functions. Apply in the order below — ordering matters for the Agora fix.

## Order of operations

1. **Migration `081_security_enable_profiles_rls.sql`** — enables RLS on `profiles`,
   adds the server-side `verify_email_with_code` RPC, drops the super-admin trigger.
   - Ship the matching client change at the same time: `src/lib/api/profiles.ts`
     `verifyEmailCode()` now calls the RPC. (Already edited in the repo — deploy the
     frontend together with this migration so signup verification keeps working.)

2. **Migration `082_fix_verify_user_email.sql`** — restricts `verify_user_email` to
   the authenticated caller.

3. **Migration `084_lock_security_definer_functions.sql`** — revokes anon EXECUTE on
   all public functions except the invite-preview + email-verify RPCs, and adds
   `auth.uid()` guards to `add_mutual_contact` / `attempt_match`.

4. **Migration `085_fix_table_policies.sql`** — fixes `support_tickets` /
   `ticket_replies` policies and adds the `circle_members` privilege-immutability
   trigger.

5. **Migration `086_storage_security.sql`** — avatars size/mime limits + owner-scoped
   delete/update on both buckets.

6. **Agora edge functions FIRST, then migration 083:**
   a. Deploy `supabase/functions/generate-agora-token/index.ts` and
      `supabase/functions/generate-agora-rtm-token/index.ts` (Dashboard → Edge
      Functions → deploy). They now read the certificate with the **service role**
      and verify call participation. Also flip **Verify JWT = ON** for both functions
      in their settings.
   b. Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in the Edge Function secrets (the
      other functions already use it).
   c. Then apply **Migration `083_lock_agora_config.sql`** — this revokes
      `get_agora_config` from anon/authenticated. Doing it before (a) would break
      token generation.
   - Frontend: `src/lib/api/agora.ts` now sends `callId` (already edited). Deploy it
     together with the new edge function.

## Manual actions (cannot be done in SQL)

- **Rotate the Agora App Certificate** in the Agora console (it was retrievable by
  anyone via the anon key — assume compromised). Then update the stored value:
  `UPDATE public.app_config SET config_value = '<NEW_CERT>' WHERE config_key = 'agora_app_certificate';`
- **Rotate the Supabase personal access token** in `.mcp.json` (Dashboard → Account →
  Access Tokens). It is gitignored and not committed, but it is an account-scoped
  token sitting in cleartext.
- **Remove debug pages** from `public/` before the next deploy: `debug-profile-picture.html`,
  `dino-game.html`, `match-dash.html` (L1).
- Consider tightening edge-function CORS from `*` to your app origin (M3) and adding
  per-user/per-IP rate limiting on the Agora functions (H3 residual).

## Verification (after applying)

Run `get_advisors(security)` again — `rls_disabled_in_public`,
`sensitive_columns_exposed`, and `rls_policy_always_true` should be gone.

With only the anon key (no session), all of these should now FAIL / return nothing:
- `POST /rest/v1/rpc/get_agora_config`            → permission denied
- `GET  /rest/v1/profiles?select=*`               → 0 rows / not permitted
- `POST /rest/v1/rpc/verify_user_email`           → permission denied (anon)
- `POST /rest/v1/rpc/add_mutual_contact`          → permission denied (anon)

As a normal authenticated test user:
- `PATCH /rest/v1/circle_members?id=eq.<own row>` with `admin_type=creator` → blocked by trigger
- `GET /rest/v1/support_tickets?select=*`         → only own tickets
- delete another user's object in `avatars`       → blocked
- a normal call still connects (token issued for your own call only)
- signup → enter 4-digit code → account verified (server-side path)

## Deferred (needs your product decision — see audit report M1)

Cross-user SELECT `USING (true)` on `social_links`, `user_interests`, `circle_members`
(`view_circle_members`), and `matchmaking_queue` were left as-is because tightening
them depends on your intended visibility model. Decide and I'll write the migration.
