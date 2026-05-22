-- 087 — Fix broken signup flow after migration 081
--
-- Migration 081 enabled RLS on profiles and revoked anon access. This broke
-- two client-side paths that made unauthenticated direct table calls:
--
--   1. storeVerificationCode() — upsert on profiles before session exists (401)
--   2. resendVerificationCode() — SELECT profiles by email as anon (401 → "User not found")
--
-- Root cause: handle_new_user trigger never copied verification_code from
-- raw_user_meta_data into profiles, so storeVerificationCode() was the only
-- path for code storage — and it's now blocked by RLS.
--
-- Fix:
--   A) Update handle_new_user to store the code atomically with profile creation.
--   B) Add resend_verification_code() SECURITY DEFINER RPC (anon-safe).

-- ---------------------------------------------------------------------------
-- A. Updated handle_new_user
--    Reads verification_code from raw_user_meta_data and stores it with a
--    60-minute expiry. Preserves all existing affiliate-resolution logic.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_invited_by_text    TEXT;
  meta_invited_circle_text TEXT;
  resolved_invited_by     UUID;
  resolved_invited_circle UUID;
  v_code                  TEXT;
  v_expires               TIMESTAMPTZ;
BEGIN
  meta_invited_by_text     := NEW.raw_user_meta_data->>'invited_by';
  meta_invited_circle_text := NEW.raw_user_meta_data->>'invited_via_circle_id';
  v_code    := NEW.raw_user_meta_data->>'verification_code';
  v_expires := NOW() + INTERVAL '60 minutes';

  BEGIN
    IF meta_invited_by_text IS NOT NULL AND meta_invited_by_text <> '' THEN
      resolved_invited_by := meta_invited_by_text::UUID;
      IF resolved_invited_by = NEW.id
         OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = resolved_invited_by) THEN
        resolved_invited_by := NULL;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    resolved_invited_by := NULL;
  END;

  BEGIN
    IF meta_invited_circle_text IS NOT NULL AND meta_invited_circle_text <> '' THEN
      resolved_invited_circle := meta_invited_circle_text::UUID;
      IF NOT EXISTS (SELECT 1 FROM circles WHERE id = resolved_invited_circle) THEN
        resolved_invited_circle := NULL;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    resolved_invited_circle := NULL;
  END;

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    email_verified,
    onboarding_completed,
    invited_by,
    invited_via_circle_id,
    verification_code,
    verification_code_expires_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    false,
    false,
    resolved_invited_by,
    resolved_invited_circle,
    v_code,
    v_expires
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    invited_by = COALESCE(profiles.invited_by, EXCLUDED.invited_by),
    invited_via_circle_id = COALESCE(profiles.invited_via_circle_id, EXCLUDED.invited_via_circle_id),
    verification_code = COALESCE(EXCLUDED.verification_code, profiles.verification_code),
    verification_code_expires_at = COALESCE(EXCLUDED.verification_code_expires_at, profiles.verification_code_expires_at);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- B. resend_verification_code(p_email)
--    Generates a fresh 4-digit code, stores it server-side (SECURITY DEFINER
--    bypasses RLS), and returns it to the caller. Safe for anon because it
--    never discloses an existing code — only ever writes a new one.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resend_verification_code(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   uuid;
  v_code text;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email is required');
  END IF;

  SELECT id INTO v_id
  FROM public.profiles
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  v_code := lpad((floor(random() * 10000))::int::text, 4, '0');

  UPDATE public.profiles
  SET verification_code = v_code,
      verification_code_expires_at = now() + interval '60 minutes'
  WHERE id = v_id;

  RETURN json_build_object('success', true, 'code', v_code);
END;
$$;

REVOKE ALL ON FUNCTION public.resend_verification_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.resend_verification_code(text) TO anon, authenticated;
