-- Migrate existing user roles from profiles.role to circle_members.role
-- This ensures users who completed onboarding before the refactor still have their roles

-- Update circle_members.role based on profiles.role for existing members
UPDATE circle_members cm
SET role = CASE 
    WHEN p.role = 'mentor' THEN 'Mentor'
    WHEN p.role = 'mentee' THEN 'Mentee'
    WHEN p.role = 'alumni' THEN 'Alumni'
    ELSE cm.role -- Keep existing role if profiles.role is NULL or invalid
END
FROM profiles p
WHERE cm.user_id = p.id
AND cm.role IS NULL; -- Only update if role is not already set

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migrated user roles from profiles.role to circle_members.role';
END $$;

