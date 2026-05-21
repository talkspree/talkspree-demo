-- 085 — SECURITY FIX (High H2 + High H1)
--
-- H2: support_tickets / ticket_replies RLS policies were named "Superadmins ..."
--     but evaluated USING (true) → any authenticated user could read AND update
--     every support ticket and read every reply.
ALTER POLICY "Superadmins can read all tickets" ON public.support_tickets
  USING (public.is_super_admin(auth.uid()) OR submitted_by_id = auth.uid());

ALTER POLICY "Superadmins can update tickets" ON public.support_tickets
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

ALTER POLICY "Authenticated users can read replies" ON public.ticket_replies
  USING (
    public.is_super_admin(auth.uid())
    OR sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_replies.ticket_id
        AND t.submitted_by_id = auth.uid()
    )
  );

-- H1: circle_members.update_own_circle_membership allowed a member to PATCH their
--     own row (USING auth.uid() = user_id, no column restriction) and set
--     admin_type='creator'/type='admin' → self-escalation to circle admin.
--     A column GRANT can't be used here because circle admins (also the
--     'authenticated' role) legitimately need to change these columns via the
--     admin policies. Enforce immutability with a trigger that exempts admins.
CREATE OR REPLACE FUNCTION public.enforce_circle_member_privilege_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_circle_member_privilege_guard ON public.circle_members;
CREATE TRIGGER trg_circle_member_privilege_guard
  BEFORE UPDATE ON public.circle_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_circle_member_privilege_immutability();
