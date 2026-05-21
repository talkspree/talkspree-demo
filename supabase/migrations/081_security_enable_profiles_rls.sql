-- 081 — SECURITY FIX (Critical C1, High H6) + server-side email OTP
--
-- Problem (verified live):
--   * public.profiles had RLS DISABLED and anon/authenticated held full
--     SELECT/INSERT/UPDATE/DELETE → anyone with the public anon key could dump,
--     alter or delete every user's PII. (C1)
--   * The custom email-OTP flow stored the code in profiles.verification_code and
--     the CLIENT read it back to compare → the OTP itself was readable by anon.
--     This is why the "Allow profile read for verification" USING(true) anon
--     policy existed. We move that check fully server-side so RLS can be locked.
--   * auto_assign_super_admin fired AFTER INSERT on profiles using the
--     user-controllable email column → an attacker could insert/replace their own
--     profile row carrying a bootstrap admin email and obtain super_admin. (H6)
--
-- This migration must be applied TOGETHER with the client change to
-- verifyEmailCode() (src/lib/api/profiles.ts), which now calls
-- verify_email_with_code() instead of reading the code.

-- 1) Server-side OTP verification. Never returns the code to the client.
CREATE OR REPLACE FUNCTION public.verify_email_with_code(p_email text, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_email IS NULL OR p_code IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Missing email or code');
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  -- Generic error on purpose (no account enumeration / no code disclosure).
  IF NOT FOUND
     OR v_profile.verification_code IS NULL
     OR v_profile.verification_code <> p_code THEN
    RETURN json_build_object('success', false, 'error', 'Invalid verification code');
  END IF;

  IF v_profile.verification_code_expires_at IS NOT NULL
     AND v_profile.verification_code_expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Verification code has expired');
  END IF;

  UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, now())
   WHERE id = v_profile.id;

  UPDATE public.profiles
     SET email_verified = true,
         verification_code = NULL,
         verification_code_expires_at = NULL
   WHERE id = v_profile.id;

  RETURN json_build_object('success', true, 'user_id', v_profile.id);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_email_with_code(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_email_with_code(text, text) TO anon, authenticated;

-- 2) Remove the user-controllable super_admin escalation (H6).
--    is_super_admin() still recognises the two bootstrap emails via auth.users,
--    so the legitimate owner accounts are unaffected. Seed any further admins by
--    inserting into platform_admins directly (service role / SQL editor).
DROP TRIGGER IF EXISTS auto_assign_super_admin ON public.profiles;

-- 3) Enable RLS and remove anon's direct access to profiles (C1).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow profile read for verification" ON public.profiles;

-- Authenticated users may read profiles (matches existing app behaviour: profile
-- cards, matchmaking, contacts all read other users' profiles). Anon can no longer
-- read the table at all — pre-login invite previews use the get_inviter_by_slug /
-- get_circle_by_abbreviation SECURITY DEFINER RPCs, not direct table access.
CREATE POLICY "Authenticated can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Existing "Allow profile insert" (WITH CHECK auth.uid() = id) and
-- "Users can update own profile" (USING/CHECK auth.uid() = id) policies remain and
-- are sufficient for signup + self-service edits.

REVOKE ALL ON public.profiles FROM anon;
