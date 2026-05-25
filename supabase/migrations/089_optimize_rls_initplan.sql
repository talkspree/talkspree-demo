-- 089 — PERFORMANCE: stop per-row re-evaluation of auth.uid() in RLS
--
-- Source: Supabase advisor `auth_rls_initplan` (84 policies across 27 tables).
-- A bare auth.uid() in a policy is re-evaluated FOR EVERY ROW the query touches.
-- Wrapping it in a scalar subquery — (select auth.uid()) — lets Postgres hoist it
-- into an InitPlan and evaluate it ONCE per statement. At scale this is the single
-- biggest RLS win.
--
-- This is a MECHANICAL rewrite: every policy's USING / WITH CHECK expression is
-- reproduced verbatim from the live catalog with `auth.uid()` -> `(select auth.uid())`.
-- It does NOT change WHO can access WHAT — only how the predicate is executed.
-- Each statement uses ALTER POLICY, so command type and target roles are untouched.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

-- blocked_users -------------------------------------------------------------
ALTER POLICY "Users can manage own blocks" ON public.blocked_users
  USING ((blocker_id = (select auth.uid())));
ALTER POLICY "Users can view who they blocked" ON public.blocked_users
  USING ((blocker_id = (select auth.uid())));

-- bug_reports ---------------------------------------------------------------
ALTER POLICY "Super admins can update bug reports" ON public.bug_reports
  USING (is_super_admin((select auth.uid())))
  WITH CHECK (is_super_admin((select auth.uid())));
ALTER POLICY "Super admins can view all bug reports" ON public.bug_reports
  USING (is_super_admin((select auth.uid())));
ALTER POLICY "Users can submit their own bug reports" ON public.bug_reports
  WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users can view their own bug reports" ON public.bug_reports
  USING (((select auth.uid()) = user_id));

-- call_history --------------------------------------------------------------
ALTER POLICY "Call participants can update call" ON public.call_history
  USING (((caller_id = (select auth.uid())) OR (recipient_id = (select auth.uid()))));
ALTER POLICY "Circle admins can view their circle call history" ON public.call_history
  USING (is_circle_admin((select auth.uid()), circle_id));
ALTER POLICY "Super admins can view all call history" ON public.call_history
  USING (is_super_admin((select auth.uid())));
ALTER POLICY "Users can insert own calls" ON public.call_history
  WITH CHECK ((caller_id = (select auth.uid())));
ALTER POLICY "Users can view own call history" ON public.call_history
  USING (((caller_id = (select auth.uid())) OR (recipient_id = (select auth.uid()))));
ALTER POLICY "call_history_insert_auth" ON public.call_history
  WITH CHECK (((select auth.uid()) = caller_id));
ALTER POLICY "call_history_select_participants" ON public.call_history
  USING ((((select auth.uid()) = caller_id) OR ((select auth.uid()) = recipient_id)));
ALTER POLICY "call_history_update_participants" ON public.call_history
  USING ((((select auth.uid()) = caller_id) OR ((select auth.uid()) = recipient_id)))
  WITH CHECK ((((select auth.uid()) = caller_id) OR ((select auth.uid()) = recipient_id)));

-- call_signals --------------------------------------------------------------
ALTER POLICY "Users can insert signals for their calls" ON public.call_signals
  WITH CHECK (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
     FROM call_history
    WHERE ((call_history.id = call_signals.call_id) AND ((call_history.caller_id = (select auth.uid())) OR (call_history.recipient_id = (select auth.uid()))))))));
ALTER POLICY "Users can view signals for their calls" ON public.call_signals
  USING ((EXISTS ( SELECT 1
     FROM call_history
    WHERE ((call_history.id = call_signals.call_id) AND ((call_history.caller_id = (select auth.uid())) OR (call_history.recipient_id = (select auth.uid())))))));

-- chat_messages -------------------------------------------------------------
ALTER POLICY "Users in call can read messages" ON public.chat_messages
  USING ((EXISTS ( SELECT 1
     FROM call_history c
    WHERE ((c.id = chat_messages.call_id) AND ((c.caller_id = (select auth.uid())) OR (c.recipient_id = (select auth.uid())))))));
ALTER POLICY "Users in call can send messages" ON public.chat_messages
  WITH CHECK (((sender_id = (select auth.uid())) AND (EXISTS ( SELECT 1
     FROM call_history c
    WHERE ((c.id = chat_messages.call_id) AND ((c.caller_id = (select auth.uid())) OR (c.recipient_id = (select auth.uid()))))))));

-- circle_member_roles -------------------------------------------------------
ALTER POLICY "Circle admins can manage role assignments" ON public.circle_member_roles
  USING (((EXISTS ( SELECT 1
     FROM (circle_members cm
       JOIN circle_members target_cm ON ((target_cm.id = circle_member_roles.circle_member_id)))
    WHERE ((cm.circle_id = target_cm.circle_id) AND (cm.user_id = (select auth.uid())) AND ((cm.admin_type = ANY (ARRAY['creator'::text, 'circle_admin'::text])) OR (cm.type = 'admin'::text))))) OR (EXISTS ( SELECT 1
     FROM platform_admins pa
    WHERE (pa.user_id = (select auth.uid()))))));
ALTER POLICY "Circle members can view role assignments" ON public.circle_member_roles
  USING ((EXISTS ( SELECT 1
     FROM (circle_members cm
       JOIN circle_members target_cm ON ((target_cm.id = circle_member_roles.circle_member_id)))
    WHERE ((cm.circle_id = target_cm.circle_id) AND (cm.user_id = (select auth.uid()))))));

-- circle_members ------------------------------------------------------------
ALTER POLICY "Admins can update circle members" ON public.circle_members
  USING ((is_super_admin((select auth.uid())) OR is_circle_admin((select auth.uid()), circle_id)))
  WITH CHECK ((is_super_admin((select auth.uid())) OR is_circle_admin((select auth.uid()), circle_id)));
ALTER POLICY "Super admins can update circle members" ON public.circle_members
  USING (is_super_admin((select auth.uid())))
  WITH CHECK (is_super_admin((select auth.uid())));
ALTER POLICY "Super admins can view all circle members" ON public.circle_members
  USING (is_super_admin((select auth.uid())));
ALTER POLICY "delete_own_circle_membership" ON public.circle_members
  USING (((select auth.uid()) = user_id));
ALTER POLICY "insert_own_circle_membership" ON public.circle_members
  WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "update_own_circle_membership" ON public.circle_members
  USING (((select auth.uid()) = user_id));

-- circle_presets ------------------------------------------------------------
ALTER POLICY "Circle admins can manage circle presets" ON public.circle_presets
  USING ((has_circle_admin_access((select auth.uid()), circle_id) OR is_super_admin((select auth.uid()))));
ALTER POLICY "Circle members can read circle presets" ON public.circle_presets
  USING (((is_active = true) AND (EXISTS ( SELECT 1
     FROM circle_members cm
    WHERE ((cm.circle_id = circle_presets.circle_id) AND (cm.user_id = (select auth.uid())) AND (cm.status = 'active'::text))))));

-- circle_roles --------------------------------------------------------------
ALTER POLICY "Admins can manage circle roles" ON public.circle_roles
  USING ((is_super_admin((select auth.uid())) OR is_circle_admin((select auth.uid()), circle_id)))
  WITH CHECK ((is_super_admin((select auth.uid())) OR is_circle_admin((select auth.uid()), circle_id)));
ALTER POLICY "Users can view circle roles" ON public.circle_roles
  USING ((is_super_admin((select auth.uid())) OR (EXISTS ( SELECT 1
     FROM circle_members cm
    WHERE ((cm.circle_id = circle_roles.circle_id) AND (cm.user_id = (select auth.uid())))))));

-- circle_topic_presets ------------------------------------------------------
ALTER POLICY "Admins can manage topic presets" ON public.circle_topic_presets
  USING ((is_super_admin((select auth.uid())) OR is_circle_admin((select auth.uid()), circle_id)))
  WITH CHECK ((is_super_admin((select auth.uid())) OR is_circle_admin((select auth.uid()), circle_id)));
ALTER POLICY "Users can view topic presets" ON public.circle_topic_presets
  USING ((is_super_admin((select auth.uid())) OR (EXISTS ( SELECT 1
     FROM circle_members cm
    WHERE ((cm.circle_id = circle_topic_presets.circle_id) AND (cm.user_id = (select auth.uid())))))));

-- circle_topics -------------------------------------------------------------
ALTER POLICY "Circle admins can manage circle topics" ON public.circle_topics
  USING ((has_circle_admin_access((select auth.uid()), circle_id) OR is_super_admin((select auth.uid()))));
ALTER POLICY "Circle members can read circle topics" ON public.circle_topics
  USING (((is_active = true) AND (EXISTS ( SELECT 1
     FROM circle_members cm
    WHERE ((cm.circle_id = circle_topics.circle_id) AND (cm.user_id = (select auth.uid())) AND (cm.status = 'active'::text))))));

-- circles -------------------------------------------------------------------
ALTER POLICY "Circle admins can update circles" ON public.circles
  USING (has_circle_admin_access((select auth.uid()), id));
ALTER POLICY "Super admins can delete circles" ON public.circles
  USING ((is_super_admin((select auth.uid())) OR is_circle_creator((select auth.uid()), id)));
ALTER POLICY "Super admins can view all circles" ON public.circles
  USING (is_super_admin((select auth.uid())));
ALTER POLICY "delete_own_circles" ON public.circles
  USING (((select auth.uid()) = created_by));
ALTER POLICY "insert_circles" ON public.circles
  WITH CHECK ((((select auth.uid()) = created_by) OR (created_by IS NULL)));
ALTER POLICY "update_own_circles" ON public.circles
  USING ((((select auth.uid()) = created_by) OR (created_by IS NULL)));

-- contacts ------------------------------------------------------------------
ALTER POLICY "Users can create contacts via mutual connect" ON public.contacts
  WITH CHECK ((((select auth.uid()) = user_id) OR ((select auth.uid()) = contact_user_id)));
ALTER POLICY "Users can delete their own contacts" ON public.contacts
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can update their own contacts" ON public.contacts
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can view their own contacts" ON public.contacts
  USING (((select auth.uid()) = user_id));

-- default_presets -----------------------------------------------------------
ALTER POLICY "Super admins can manage default presets" ON public.default_presets
  USING (is_super_admin((select auth.uid())));

-- default_topics ------------------------------------------------------------
ALTER POLICY "Super admins can manage default topics" ON public.default_topics
  USING (is_super_admin((select auth.uid())));

-- direct_messages -----------------------------------------------------------
ALTER POLICY "Recipients can mark messages as read" ON public.direct_messages
  USING (((select auth.uid()) = recipient_id))
  WITH CHECK (((select auth.uid()) = recipient_id));
ALTER POLICY "Senders can edit their own messages" ON public.direct_messages
  USING (((select auth.uid()) = sender_id))
  WITH CHECK (((select auth.uid()) = sender_id));
ALTER POLICY "Users can delete their own messages" ON public.direct_messages
  USING ((((select auth.uid()) = sender_id) OR ((select auth.uid()) = recipient_id)));
ALTER POLICY "Users can read their own messages" ON public.direct_messages
  USING ((((select auth.uid()) = sender_id) OR ((select auth.uid()) = recipient_id)));
ALTER POLICY "Users can send messages" ON public.direct_messages
  WITH CHECK (((select auth.uid()) = sender_id));

-- matchmaking_queue ---------------------------------------------------------
ALTER POLICY "Allow view waiting queue" ON public.matchmaking_queue
  USING ((((select auth.uid()) IS NOT NULL) AND (status = 'waiting'::text)));
ALTER POLICY "Users can delete own queue entry" ON public.matchmaking_queue
  USING ((user_id = (select auth.uid())));
ALTER POLICY "Users can insert own queue entry" ON public.matchmaking_queue
  WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "Users can update own queue entry" ON public.matchmaking_queue
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "Users can view own queue entry" ON public.matchmaking_queue
  USING ((user_id = (select auth.uid())));

-- notifications -------------------------------------------------------------
ALTER POLICY "Users can update own notifications" ON public.notifications
  USING ((user_id = (select auth.uid())));
ALTER POLICY "Users can view own notifications" ON public.notifications
  USING ((user_id = (select auth.uid())));

-- platform_admins -----------------------------------------------------------
ALTER POLICY "Super admins can view platform admins" ON public.platform_admins
  USING ((is_super_admin((select auth.uid())) OR (user_id = (select auth.uid()))));

-- profiles ------------------------------------------------------------------
ALTER POLICY "Allow profile insert" ON public.profiles
  WITH CHECK (((select auth.uid()) = id));
ALTER POLICY "Users can update own profile" ON public.profiles
  USING (((select auth.uid()) = id))
  WITH CHECK (((select auth.uid()) = id));

-- reports -------------------------------------------------------------------
ALTER POLICY "Circle admins can update their circle reports" ON public.reports
  USING (can_view_call_report((select auth.uid()), call_id))
  WITH CHECK (can_view_call_report((select auth.uid()), call_id));
ALTER POLICY "Circle admins can view their circle reports" ON public.reports
  USING (can_view_call_report((select auth.uid()), call_id));
ALTER POLICY "Super admins can update reports" ON public.reports
  USING (is_super_admin((select auth.uid())))
  WITH CHECK (is_super_admin((select auth.uid())));
ALTER POLICY "Super admins can view all reports" ON public.reports
  USING (is_super_admin((select auth.uid())));
ALTER POLICY "Users can create reports" ON public.reports
  WITH CHECK ((reporter_id = (select auth.uid())));
ALTER POLICY "Users can view own reports" ON public.reports
  USING ((reporter_id = (select auth.uid())));

-- social_links --------------------------------------------------------------
ALTER POLICY "Users can delete own social links" ON public.social_links
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can insert own social links" ON public.social_links
  WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users can update own social links" ON public.social_links
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can view own social links" ON public.social_links
  USING (((select auth.uid()) = user_id));

-- support_tickets -----------------------------------------------------------
ALTER POLICY "Anyone authenticated can submit a ticket" ON public.support_tickets
  WITH CHECK ((submitted_by_id = (select auth.uid())));
ALTER POLICY "Superadmins can read all tickets" ON public.support_tickets
  USING ((is_super_admin((select auth.uid())) OR (submitted_by_id = (select auth.uid()))));
ALTER POLICY "Superadmins can update tickets" ON public.support_tickets
  USING (is_super_admin((select auth.uid())))
  WITH CHECK (is_super_admin((select auth.uid())));

-- ticket_replies ------------------------------------------------------------
ALTER POLICY "Authenticated users can insert replies" ON public.ticket_replies
  WITH CHECK ((sender_id = (select auth.uid())));
ALTER POLICY "Authenticated users can read replies" ON public.ticket_replies
  USING ((is_super_admin((select auth.uid())) OR (sender_id = (select auth.uid())) OR (EXISTS ( SELECT 1
     FROM support_tickets t
    WHERE ((t.id = ticket_replies.ticket_id) AND (t.submitted_by_id = (select auth.uid())))))));

-- user_interests ------------------------------------------------------------
ALTER POLICY "Users can delete own interests" ON public.user_interests
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can insert own interests" ON public.user_interests
  WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users can update own interests" ON public.user_interests
  USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can view own interests" ON public.user_interests
  USING (((select auth.uid()) = user_id));

-- user_presets --------------------------------------------------------------
ALTER POLICY "Users can manage own presets" ON public.user_presets
  USING ((user_id = (select auth.uid())));
ALTER POLICY "Users can read own presets" ON public.user_presets
  USING ((user_id = (select auth.uid())));

-- user_topics ---------------------------------------------------------------
ALTER POLICY "Users can manage own topics" ON public.user_topics
  USING ((user_id = (select auth.uid())));
ALTER POLICY "Users can read own topics" ON public.user_topics
  USING ((user_id = (select auth.uid())));
