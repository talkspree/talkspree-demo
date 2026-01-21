-- Refactor circle_members table to separate member type from user role
-- Current: 'role' column contains 'admin'/'moderator'/'member' (member type)
-- Desired: 'type' column for member type, 'role' column for actual user role (Mentor/Mentee/Alumni/etc)

-- ============================================================================
-- STEP 1: Rename 'role' column to 'type'
-- ============================================================================

-- Rename the column
ALTER TABLE circle_members 
RENAME COLUMN role TO type;

-- Update the check constraint
ALTER TABLE circle_members 
DROP CONSTRAINT IF EXISTS circle_members_role_check;

ALTER TABLE circle_members 
ADD CONSTRAINT circle_members_type_check 
CHECK (type IN ('admin', 'moderator', 'member'));

-- ============================================================================
-- STEP 2: Add new 'role' column for actual user role
-- ============================================================================

-- Add the new role column (nullable, as existing members may not have a role yet)
ALTER TABLE circle_members 
ADD COLUMN IF NOT EXISTS role TEXT;

-- Add check constraint for role (can be extended with more roles as needed)
ALTER TABLE circle_members 
ADD CONSTRAINT circle_members_role_check 
CHECK (role IS NULL OR role IN ('Mentor', 'Mentee', 'Alumni', 'Student', 'Professional', 'Other'));

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_circle_members_role ON circle_members(role);

-- ============================================================================
-- STEP 3: Update existing data
-- ============================================================================

-- For the "Mentor the Young" circle, set default roles based on existing data
UPDATE circle_members
SET role = 'Mentee'
WHERE role IS NULL AND circle_id IN (
    SELECT id FROM circles WHERE name = 'Mentor the Young'
);

-- ============================================================================
-- STEP 4: Update helper functions
-- ============================================================================

-- Update get_user_circle_role function to return the actual role
CREATE OR REPLACE FUNCTION get_user_circle_role(user_uuid UUID, circle_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    member_record RECORD;
BEGIN
    -- Check if user is a super admin
    IF is_super_admin(user_uuid) THEN
        RETURN 'Super Admin';
    END IF;
    
    -- Get the member's record
    SELECT admin_type, type, role INTO member_record
    FROM circle_members
    WHERE user_id = user_uuid 
    AND circle_id = circle_uuid
    AND status = 'active';
    
    -- If not a member, return NULL
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Return based on admin_type first, then the actual role
    IF member_record.admin_type = 'creator' THEN
        RETURN 'Creator';
    ELSIF member_record.admin_type = 'circle_admin' THEN
        RETURN 'Admin';
    ELSIF member_record.type = 'admin' THEN
        RETURN 'Admin';
    ELSE
        -- Return the actual user role (Mentor, Mentee, etc.)
        RETURN COALESCE(member_record.role, 'Member');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

