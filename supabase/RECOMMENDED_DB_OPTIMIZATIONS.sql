-- ============================================================================
-- RECOMMENDED DATABASE OPTIMIZATIONS & SECURITY HARDENING  (REVIEW BEFORE APPLYING)
-- ============================================================================
-- Source: Supabase advisors (security + performance) run against the live DB.
-- This file is intentionally NOT placed in supabase/migrations/ — it is a
-- review-only worksheet. Apply sections individually, TEST IN STAGING, then
-- (optionally) promote the parts you keep into a numbered migration (next: 088_).
--
-- NOTE: prior hardening migrations already exist (081 profiles RLS, 083 lock
-- agora config, 084 lock security-definer functions, 085 table policies,
-- 086 storage security). Cross-check against those before applying so you
-- don't duplicate or conflict with work already done.
--
-- Suggested order:  Section 1 (indexes) -> Section 2 (RLS initplan) ->
--                   Section 4/5/6 (security) ->  Section 3 (policy merge) LAST.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — Add covering indexes for unindexed foreign keys   [SAFE / additive]
-- Advisor: unindexed_foreign_keys (20 FKs). Improves joins, cascade deletes,
-- and lookups that filter by these columns. IF NOT EXISTS makes it re-runnable.
-- Verify each column name matches your schema before running.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bug_reports_resolved_by            ON public.bug_reports (resolved_by);
CREATE INDEX IF NOT EXISTS idx_call_history_extend_approved_by    ON public.call_history (extend_approved_by);
CREATE INDEX IF NOT EXISTS idx_call_history_extend_requested_by   ON public.call_history (extend_requested_by);
CREATE INDEX IF NOT EXISTS idx_call_signals_sender_id             ON public.call_signals (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id            ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_circle_member_roles_assigned_by    ON public.circle_member_roles (assigned_by);
CREATE INDEX IF NOT EXISTS idx_circle_presets_created_by          ON public.circle_presets (created_by);
CREATE INDEX IF NOT EXISTS idx_circle_topic_presets_created_by    ON public.circle_topic_presets (created_by);
CREATE INDEX IF NOT EXISTS idx_circle_topics_created_by           ON public.circle_topics (created_by);
CREATE INDEX IF NOT EXISTS idx_circles_created_by                 ON public.circles (created_by);
CREATE INDEX IF NOT EXISTS idx_contacts_circle_id                 ON public.contacts (circle_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_call_id            ON public.direct_messages (call_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by            ON public.invite_codes (created_by);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_circle_id        ON public.matchmaking_queue (circle_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_granted_by         ON public.platform_admins (granted_by);
CREATE INDEX IF NOT EXISTS idx_reports_call_id                    ON public.reports (call_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by                ON public.reports (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_circle_id          ON public.support_tickets (circle_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_submitted_by_id    ON public.support_tickets (submitted_by_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id           ON public.ticket_replies (ticket_id);


-- ============================================================================
-- SECTION 2 — Fix per-row re-evaluation of auth.uid() in RLS  [BIGGEST PERF WIN]
-- Advisor: auth_rls_initplan (84 policies across 27 tables).
-- Problem: policies that reference auth.uid() / auth.role() / current_setting()
-- bare are re-evaluated FOR EVERY ROW. Wrapping them in a scalar subquery
-- — (select auth.uid()) — lets Postgres evaluate them ONCE per query.
-- This does NOT change WHO can access WHAT; it only changes execution. Low risk.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
--
-- 1) Enumerate every affected policy and its current definition:
--
--    SELECT schemaname, tablename, policyname, cmd, qual, with_check
--    FROM pg_policies
--    WHERE schemaname = 'public'
--      AND (qual ~ 'auth\.(uid|role|jwt)\(\)' OR with_check ~ 'auth\.(uid|role|jwt)\(\)')
--    ORDER BY tablename, policyname;
--
-- 2) For each, recreate it replacing bare calls with a subquery. Pattern:
--      auth.uid()           ->  (select auth.uid())
--      auth.role()          ->  (select auth.role())
--    EXAMPLE (template — substitute the real expression from step 1):
--
--      ALTER POLICY "Users can view own contacts" ON public.contacts
--        USING ( user_id = (select auth.uid()) );
--
--      -- or DROP + CREATE if you need to change both USING and WITH CHECK:
--      -- DROP POLICY "..." ON public.<table>;
--      -- CREATE POLICY "..." ON public.<table>
--      --   FOR <cmd> TO <roles>
--      --   USING ( <qual with (select auth.uid())> )
--      --   WITH CHECK ( <with_check with (select auth.uid())> );
--
-- Apply table-by-table, re-running get_advisors(performance) to confirm the
-- initplan count drops. Affected tables: profiles, contacts, circles,
-- circle_members, call_history, call_signals, chat_messages, direct_messages,
-- matchmaking_queue, notifications, blocked_users, reports, user_interests,
-- social_links, default_topics, default_presets, circle_member_roles,
-- circle_roles, circle_topic_presets, circle_topics, circle_presets,
-- user_topics, user_presets, bug_reports, support_tickets, ticket_replies,
-- platform_admins.
-- ============================================================================


-- ============================================================================
-- SECTION 3 — Consolidate multiple permissive policies   [APPLY LAST / OPTIONAL]
-- Advisor: multiple_permissive_policies (30 instances / 19 tables).
-- Multiple PERMISSIVE policies for the same {role, action} are OR-ed together
-- and each is evaluated on every query. Merging them into one policy per
-- role+action reduces overhead.
-- *** HIGHEST-RISK SQL ITEM ***: merging the USING/WITH CHECK conditions wrong
-- silently changes who can see/modify rows. Do this only AFTER Sections 1 & 2
-- are verified, change one table at a time, and test access for each. It is
-- perfectly fine to SKIP this entirely — it's an optimization, not a fix.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies
--
-- Enumerate the overlaps first:
--    SELECT tablename, cmd, roles, count(*) AS n, array_agg(policyname)
--    FROM pg_policies
--    WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
--    GROUP BY tablename, cmd, roles
--    HAVING count(*) > 1
--    ORDER BY tablename, cmd;
-- Then, per group, replace the N policies with ONE whose condition is the
-- logical OR of the originals.
-- ============================================================================


-- ============================================================================
-- SECTION 4 — Pin search_path on functions   [SECURITY hardening]
-- Advisor: function_search_path_mutable (32 functions). A mutable search_path
-- is a privilege-escalation vector, especially for SECURITY DEFINER functions.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
--
-- Generate the exact ALTER statements (handles overloaded signatures):
--    SELECT format('ALTER FUNCTION %s SET search_path = '''';',
--                  p.oid::regprocedure)
--    FROM pg_proc p
--    JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public'
--      AND NOT EXISTS (
--        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c
--        WHERE c LIKE 'search_path=%'
--      );
-- Review the output, then run the generated statements. (Setting search_path
-- to '' forces fully-qualified names inside the function — confirm each function
-- already schema-qualifies its table references, or use 'public' instead of '').
-- ============================================================================


-- ============================================================================
-- SECTION 5 — Restrict anon EXECUTE on SECURITY DEFINER RPCs   [SECURITY — CAREFUL]
-- Advisor: anon_security_definer_function_executable (42 functions) +
--          authenticated_security_definer_function_executable (44 functions).
-- *** DO NOT blanket-revoke. *** Several of these MUST stay callable by anon or
-- you WILL break signup / email verification / affiliate invite links, e.g.:
--    handle_new_user, verify_email_with_code, resend_verification_code,
--    get_inviter_by_slug, get_circle_by_abbreviation
-- (cross-check against migration 084 which already locked some.)
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
--
-- For functions that should NEVER run unauthenticated (examples — verify each):
--    REVOKE EXECUTE ON FUNCTION public.delete_old_call_data()      FROM anon;
--    REVOKE EXECUTE ON FUNCTION public.delete_old_chat_messages()  FROM anon;
--    REVOKE EXECUTE ON FUNCTION public.send_direct_message(/*args*/) FROM anon;
--    REVOKE EXECUTE ON FUNCTION public.is_super_admin(/*args*/)     FROM anon, authenticated;
-- Pure read-only helpers that don't need elevated rights are better converted
-- to SECURITY INVOKER so they respect the caller's RLS instead.
-- TEST signup, email verification, chat, and admin flows in STAGING first.
-- ============================================================================


-- ============================================================================
-- SECTION 6 — Storage bucket listing + Auth config   [SECURITY — mostly dashboard]
-- 6a. public_bucket_allows_listing (buckets: avatars, circle-assets)
--     A broad SELECT policy on storage.objects lets clients enumerate every
--     file in the bucket. Public URLs still work without listing. Tighten the
--     SELECT policy so anon/authenticated cannot list arbitrary objects.
--     (cross-check migration 086_storage_security.sql.)
--     Ref: https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing
--
-- 6b. auth_leaked_password_protection is DISABLED.
--     Enable it in Dashboard: Authentication -> Policies / Password settings
--     (HaveIBeenPwned check). No SQL required.
--
-- 6c. app_config table "stores Agora credentials": confirm its RLS does NOT
--     allow client SELECT of secrets. Agora tokens should be issued only by the
--     edge functions (generate-agora-token / generate-agora-rtm-token).
--     (cross-check migration 083_lock_agora_config.sql.)
-- ============================================================================


-- ============================================================================
-- SECTION 7 — Unused indexes   [DEFER — informational only]
-- Advisor flagged 22 indexes as unused. This is a DEMO DB with immature stats;
-- DO NOT drop indexes based on this until you have real production traffic and
-- can confirm via pg_stat_user_indexes (idx_scan = 0 over a meaningful window).
-- ============================================================================
