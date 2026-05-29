-- 090 — Community moderation (Warn / Restrict / Ban)
-- ============================================================================
-- Adds per-circle moderation to circle_members WITHOUT new tables:
--   * moderation_* columns (state kept SEPARATE from membership `status` so the
--     pervasive status='active' checks — counts, getUserCircles, preset/topic
--     RLS, matchmaking — keep working and a warning stays non-blocking).
--   * 3 SECURITY DEFINER RPCs (apply / get-mine / acknowledge).
--   * Extends the privilege-immutability trigger (085) to guard moderation_*
--     against direct self-service edits (close the self-clear hole).
--   * RESTRICTIVE matchmaking_queue policies so restricted/banned users cannot
--     queue (server-side enforcement, not just UI).
-- Reuses existing helpers public.is_super_admin / public.is_circle_admin and the
-- existing notifications table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2a. Columns on circle_members (status untouched)
-- ----------------------------------------------------------------------------
ALTER TABLE public.circle_members
  ADD COLUMN IF NOT EXISTS moderation_state text NOT NULL DEFAULT 'none'
    CHECK (moderation_state IN ('none', 'warned', 'restricted', 'banned')),
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderation_message text,
  ADD COLUMN IF NOT EXISTS moderation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_acknowledged_at timestamptz,
  -- NOTE: deliberately NO foreign key — a second circle_members→profiles FK makes
  -- every `profiles(...)` PostgREST embed ambiguous (PGRST201). Plain uuid only.
  ADD COLUMN IF NOT EXISTS moderation_by uuid,
  ADD COLUMN IF NOT EXISTS moderation_updated_at timestamptz;

-- Small partial index: only the (few) actively-moderated rows.
CREATE INDEX IF NOT EXISTS idx_circle_members_moderation
  ON public.circle_members (circle_id, user_id)
  WHERE moderation_state <> 'none';

-- ----------------------------------------------------------------------------
-- 2b. Participation-block helper (drives queue RLS + the app START gate)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_circle_participation_blocked(p_user uuid, p_circle uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_circle IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.user_id = p_user
        AND cm.circle_id = p_circle
        AND (cm.moderation_state = 'banned'
             OR (cm.moderation_state = 'restricted'
                 AND cm.moderation_expires_at IS NOT NULL
                 AND cm.moderation_expires_at > now()))
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.is_circle_participation_blocked(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_circle_participation_blocked(uuid, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2c-1. apply_circle_moderation — admin issues warn / restrict / ban / clear
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_circle_moderation(
  p_circle_id uuid,
  p_user_id uuid,
  p_action text,                 -- 'warn' | 'restrict' | 'ban' | 'clear'
  p_reason text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_duration_hours integer DEFAULT NULL
)
RETURNS public.circle_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target_admin_type text;
  v_new_state text;
  v_expires timestamptz := NULL;
  v_row public.circle_members;
  v_notif_type text;
  v_title text;
BEGIN
  -- Trusted-write flag read by the immutability trigger (transaction-local).
  PERFORM set_config('app.moderation_write', 'on', true);

  IF NOT (public.is_super_admin(v_actor) OR public.is_circle_admin(v_actor, p_circle_id)) THEN
    RAISE EXCEPTION 'Not authorized to moderate this circle';
  END IF;

  -- Only super admins may moderate a circle creator.
  SELECT admin_type INTO v_target_admin_type
  FROM public.circle_members
  WHERE circle_id = p_circle_id AND user_id = p_user_id;

  IF v_target_admin_type = 'creator' AND NOT public.is_super_admin(v_actor) THEN
    RAISE EXCEPTION 'Only super admins can moderate a circle creator';
  END IF;

  CASE p_action
    WHEN 'warn' THEN v_new_state := 'warned';
    WHEN 'restrict' THEN
      v_new_state := 'restricted';
      v_expires := now() + make_interval(hours => COALESCE(p_duration_hours, 24));
    WHEN 'ban' THEN v_new_state := 'banned';
    WHEN 'clear' THEN v_new_state := 'none';
    ELSE RAISE EXCEPTION 'Invalid moderation action: %', p_action;
  END CASE;

  UPDATE public.circle_members
  SET moderation_state          = v_new_state,
      moderation_reason         = CASE WHEN v_new_state = 'none' THEN NULL ELSE p_reason END,
      moderation_message        = CASE WHEN v_new_state = 'none' THEN NULL ELSE p_message END,
      moderation_expires_at     = v_expires,
      moderation_acknowledged_at = NULL,
      moderation_by             = CASE WHEN v_new_state = 'none' THEN NULL ELSE v_actor END,
      moderation_updated_at     = now()
  WHERE circle_id = p_circle_id AND user_id = p_user_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found for user % in circle %', p_user_id, p_circle_id;
  END IF;

  -- Restrict/ban: drop any in-flight matchmaking and clear presence so the user
  -- cannot already be sitting in the queue / a call.
  IF v_new_state IN ('restricted', 'banned') THEN
    DELETE FROM public.matchmaking_queue WHERE user_id = p_user_id;
    UPDATE public.profiles SET is_online = false, in_call = false WHERE id = p_user_id;
  END IF;

  v_notif_type := CASE v_new_state
    WHEN 'warned'     THEN 'moderation_warning'
    WHEN 'restricted' THEN 'moderation_restriction'
    WHEN 'banned'     THEN 'moderation_ban'
    ELSE                   'moderation_restored'
  END;
  v_title := CASE v_new_state
    WHEN 'warned'     THEN 'You have received a warning'
    WHEN 'restricted' THEN 'Your account has been restricted'
    WHEN 'banned'     THEN 'You have been banned from this circle'
    ELSE                   'Your access has been restored'
  END;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    v_notif_type,
    v_title,
    p_message,
    jsonb_build_object(
      'action', p_action,
      'moderation_state', v_new_state,
      'reason', p_reason,
      'expires_at', v_expires,
      'circle_id', p_circle_id
    )
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_circle_moderation(uuid, uuid, text, text, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_circle_moderation(uuid, uuid, text, text, text, integer) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2c-2. get_my_circle_moderation — app entry read (+ lazy restriction expiry)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_circle_moderation(p_circle_id uuid)
RETURNS TABLE (
  moderation_state text,
  moderation_reason text,
  moderation_message text,
  moderation_expires_at timestamptz,
  moderation_acknowledged_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  PERFORM set_config('app.moderation_write', 'on', true);

  -- Lazily lift expired restrictions for the caller's own membership.
  UPDATE public.circle_members cm
  SET moderation_state          = 'none',
      moderation_reason         = NULL,
      moderation_message        = NULL,
      moderation_expires_at     = NULL,
      moderation_acknowledged_at = NULL,
      moderation_by             = NULL,
      moderation_updated_at     = now()
  WHERE cm.user_id = v_user
    AND cm.circle_id = p_circle_id
    AND cm.moderation_state = 'restricted'
    AND cm.moderation_expires_at IS NOT NULL
    AND cm.moderation_expires_at <= now();

  RETURN QUERY
  SELECT cm.moderation_state, cm.moderation_reason, cm.moderation_message,
         cm.moderation_expires_at, cm.moderation_acknowledged_at
  FROM public.circle_members cm
  WHERE cm.user_id = v_user AND cm.circle_id = p_circle_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_circle_moderation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_circle_moderation(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2c-3. acknowledge_circle_moderation — user dismisses the warning/restriction
--        modal. Touches ONLY moderation_acknowledged_at on the caller's row.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acknowledge_circle_moderation(p_circle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  PERFORM set_config('app.moderation_write', 'on', true);
  UPDATE public.circle_members
  SET moderation_acknowledged_at = now()
  WHERE user_id = v_user
    AND circle_id = p_circle_id
    AND moderation_acknowledged_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_circle_moderation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.acknowledge_circle_moderation(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2d. Extend the privilege-immutability trigger (085) to also guard the
--     moderation_* columns. Preserves the original admin_type/type/role guard.
--     Moderation columns may change ONLY when the trusted-write flag is set
--     (i.e. inside the RPCs above) or by a circle/super admin.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_circle_member_privilege_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Original guard (085): privilege columns are admin-only.
  IF (NEW.admin_type IS DISTINCT FROM OLD.admin_type
      OR NEW.type     IS DISTINCT FROM OLD.type
      OR NEW.role     IS DISTINCT FROM OLD.role)
     AND NOT (
       public.is_super_admin(auth.uid())
       OR public.is_circle_admin(auth.uid(), OLD.circle_id)
     )
  THEN
    RAISE EXCEPTION 'Not authorized to change circle member privileges';
  END IF;

  -- Moderation columns: trusted RPC (flag) or admins only.
  IF (NEW.moderation_state           IS DISTINCT FROM OLD.moderation_state
      OR NEW.moderation_reason          IS DISTINCT FROM OLD.moderation_reason
      OR NEW.moderation_message         IS DISTINCT FROM OLD.moderation_message
      OR NEW.moderation_expires_at      IS DISTINCT FROM OLD.moderation_expires_at
      OR NEW.moderation_acknowledged_at IS DISTINCT FROM OLD.moderation_acknowledged_at
      OR NEW.moderation_by              IS DISTINCT FROM OLD.moderation_by
      OR NEW.moderation_updated_at      IS DISTINCT FROM OLD.moderation_updated_at)
     AND COALESCE(current_setting('app.moderation_write', true), '') <> 'on'
     AND NOT (
       public.is_super_admin(auth.uid())
       OR public.is_circle_admin(auth.uid(), OLD.circle_id)
     )
  THEN
    RAISE EXCEPTION 'Moderation fields can only be changed via moderation functions';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists from 085; recreate defensively.
DROP TRIGGER IF EXISTS trg_circle_member_privilege_guard ON public.circle_members;
CREATE TRIGGER trg_circle_member_privilege_guard
  BEFORE UPDATE ON public.circle_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_circle_member_privilege_immutability();

-- ----------------------------------------------------------------------------
-- 2e. Block moderated users from matchmaking at the RLS layer (server-side).
--     RESTRICTIVE policies AND with the existing permissive own-row policies.
--     DELETE stays permissive so users/cleanup can always leave the queue.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Block moderated users from queue insert" ON public.matchmaking_queue;
CREATE POLICY "Block moderated users from queue insert" ON public.matchmaking_queue
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_circle_participation_blocked((select auth.uid()), circle_id));

DROP POLICY IF EXISTS "Block moderated users from queue update" ON public.matchmaking_queue;
CREATE POLICY "Block moderated users from queue update" ON public.matchmaking_queue
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_circle_participation_blocked((select auth.uid()), circle_id))
  WITH CHECK (NOT public.is_circle_participation_blocked((select auth.uid()), circle_id));

-- Refresh the PostgREST schema cache so the new RPCs are callable immediately.
NOTIFY pgrst, 'reload schema';
