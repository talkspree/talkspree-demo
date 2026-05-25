-- 088 — PERFORMANCE: covering indexes for unindexed foreign keys
--
-- Source: Supabase advisor `unindexed_foreign_keys` (20 FKs).
-- Foreign-key columns without a backing index force sequential scans on joins,
-- cascade deletes, and lookups that filter by the FK. Adding btree indexes is
-- purely additive — it changes NO behavior, only execution speed. IF NOT EXISTS
-- makes this migration safely re-runnable.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

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
