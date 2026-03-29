-- Add allow_member_custom_topics flag to circles
-- When false, members cannot use the Custom topic feature (create personal presets / use-once topics)
-- Admins retain full topic management capabilities regardless of this setting

ALTER TABLE circles
  ADD COLUMN IF NOT EXISTS allow_member_custom_topics BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN circles.allow_member_custom_topics IS
  'When false, circle members cannot use the Custom topic feature. Admins are unaffected.';
