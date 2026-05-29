-- 091 — Fix admin helper functions' search_path
-- ============================================================================
-- is_super_admin / is_circle_admin were SECURITY DEFINER with NO `SET search_path`
-- and referenced UNQUALIFIED tables (platform_admins, circle_members). When
-- invoked from a `search_path=''` context — the circle_members privilege trigger
-- (085/090) and the moderation RPCs (090) — they inherited the empty search_path
-- and failed to resolve those tables ("relation platform_admins does not exist",
-- which PostgREST returns as HTTP 404). That broke promote-to-admin, status
-- changes, and the moderation actions.
--
-- Fix: pin `SET search_path = ''` and schema-qualify every reference, so these
-- helpers behave identically no matter the caller's search_path. (Also clears
-- the function_search_path_mutable advisor lint for these functions.)
-- Logic is otherwise unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_email text;
BEGIN
    -- Primary: platform_admins table
    IF EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE user_id = user_uuid
          AND admin_type = 'super_admin'
    ) THEN
        RETURN TRUE;
    END IF;

    -- Fallback: hardcoded super-admin email allowlist
    SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
    IF user_email IN ('talkspree.app@gmail.com', 'mihail.hummel@gmail.com') THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_circle_admin(user_uuid uuid, circle_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF user_uuid IS NULL OR circle_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.circle_members
        WHERE user_id = user_uuid
          AND circle_id = circle_uuid
          AND admin_type IN ('creator', 'circle_admin')
    );
END;
$$;

-- Admin-manager circle-admin policy helper (reports → call_history → circle).
-- Same latent bug; qualify + pin search_path for safety.
CREATE OR REPLACE FUNCTION public.can_view_call_report(user_uuid uuid, call_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_circle_id uuid;
BEGIN
    IF call_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    SELECT circle_id INTO v_circle_id FROM public.call_history WHERE id = call_uuid;
    RETURN public.is_circle_admin(user_uuid, v_circle_id);
END;
$$;

-- Refresh the PostgREST schema cache (also makes the moderation_* columns from
-- 090 visible to the admin circle_members select if the cache was stale).
NOTIFY pgrst, 'reload schema';
