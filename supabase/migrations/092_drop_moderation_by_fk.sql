-- 092 — Drop the moderation_by foreign key (fixes PGRST201 ambiguous embeds)
-- ============================================================================
-- 090 added `moderation_by uuid REFERENCES profiles(id)`, creating a SECOND
-- foreign key from circle_members → profiles (the first being user_id). That
-- makes every PostgREST `profiles(...)` embed on circle_members ambiguous:
--   "Could not embed because more than one relationship was found
--    for 'circle_members' and 'profiles'" (code PGRST201)
-- which broke the admin circle user list (getCircleMembersWithRoles) and the
-- app's getCircleMemberCounts (→ CircleContext load failed → moderation never
-- loaded → no modals).
--
-- We never embed/join on moderation_by, so just drop the FK and keep it as a
-- plain uuid. This restores the single user_id↔profiles relationship and makes
-- all existing embeds unambiguous again — no query changes needed.
-- ============================================================================

ALTER TABLE public.circle_members
  DROP CONSTRAINT IF EXISTS circle_members_moderation_by_fkey;

NOTIFY pgrst, 'reload schema';
