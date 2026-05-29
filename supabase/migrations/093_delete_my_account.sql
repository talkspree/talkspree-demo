-- 093 — Allow users to delete their own account
-- ============================================================================
-- Adds a SECURITY DEFINER RPC that lets an authenticated user delete their own
-- profile and auth.users row in one call. Related rows (interests, social
-- links, circle memberships, etc.) cascade via existing FK ON DELETE CASCADE.
--
-- The function runs as the function owner (postgres), which has permission to
-- delete from auth.users. We hard-pin search_path = '' for safety and require a
-- valid auth.uid() so anonymous callers cannot invoke it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    -- Best-effort cleanup of rows that don't have ON DELETE CASCADE on
    -- profiles/auth.users. Wrapped individually so a missing table doesn't
    -- abort the whole delete (e.g. older databases pre-090).
    BEGIN
        UPDATE public.matchmaking_queue
           SET status = 'cancelled'
         WHERE user_id = current_user_id
           AND status = 'waiting';
    EXCEPTION WHEN undefined_table THEN NULL; END;

    BEGIN
        DELETE FROM public.user_interests WHERE user_id = current_user_id;
    EXCEPTION WHEN undefined_table THEN NULL; END;

    BEGIN
        DELETE FROM public.social_links WHERE user_id = current_user_id;
    EXCEPTION WHEN undefined_table THEN NULL; END;

    BEGIN
        DELETE FROM public.circle_members WHERE user_id = current_user_id;
    EXCEPTION WHEN undefined_table THEN NULL; END;

    -- Delete the profile (any remaining FK-cascaded rows go with it).
    DELETE FROM public.profiles WHERE id = current_user_id;

    -- Finally remove the auth record so the email can be reused for signup.
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
