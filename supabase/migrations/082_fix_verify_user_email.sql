-- 082 — SECURITY FIX (Critical C3)
--
-- Problem (verified live): verify_user_email(user_id uuid) was SECURITY DEFINER,
-- executable by anon, and confirmed whatever user_id was passed in (no auth.uid()
-- check). Anyone could mark any account email-confirmed:
--   POST /rest/v1/rpc/verify_user_email {"user_id":"<any>"}
--
-- The signup flow now uses verify_email_with_code() (migration 081). This function
-- is kept only as a self-service confirm and can no longer touch other accounts.
CREATE OR REPLACE FUNCTION public.verify_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_id THEN
    RAISE EXCEPTION 'Not authorized to verify this account';
  END IF;

  UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, now())
   WHERE id = user_id;

  UPDATE public.profiles
     SET email_verified = true
   WHERE id = user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_user_email(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.verify_user_email(uuid) TO authenticated;
