-- Fix RLS policies for admin access to circle_roles and circle_topic_presets
-- The issue: Super admins couldn't access these tables because the policies required circle membership

-- ============================================================================
-- UPDATE CIRCLE ROLES RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Circle members can view circle roles" ON circle_roles;
DROP POLICY IF EXISTS "Circle admins can manage roles" ON circle_roles;

-- New policy: Allow super admins and circle members to view roles
CREATE POLICY "Users can view circle roles"
    ON circle_roles FOR SELECT
    TO authenticated
    USING (
        -- Super admins can view all roles
        is_super_admin(auth.uid())
        OR
        -- Circle members can view their circle's roles
        EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.circle_id = circle_roles.circle_id
            AND cm.user_id = auth.uid()
        )
    );

-- New policy: Allow super admins and circle admins to manage roles
CREATE POLICY "Admins can manage circle roles"
    ON circle_roles FOR ALL
    TO authenticated
    USING (
        -- Super admins have full access
        is_super_admin(auth.uid())
        OR
        -- Circle admins can manage their circle's roles
        is_circle_admin(auth.uid(), circle_id)
    )
    WITH CHECK (
        -- Super admins have full access
        is_super_admin(auth.uid())
        OR
        -- Circle admins can manage their circle's roles
        is_circle_admin(auth.uid(), circle_id)
    );

-- ============================================================================
-- UPDATE CIRCLE TOPIC PRESETS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Circle members can view topic presets" ON circle_topic_presets;
DROP POLICY IF EXISTS "Circle admins can manage topic presets" ON circle_topic_presets;

-- New policy: Allow super admins and circle members to view presets
CREATE POLICY "Users can view topic presets"
    ON circle_topic_presets FOR SELECT
    TO authenticated
    USING (
        -- Super admins can view all presets
        is_super_admin(auth.uid())
        OR
        -- Circle members can view their circle's presets
        EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.circle_id = circle_topic_presets.circle_id
            AND cm.user_id = auth.uid()
        )
    );

-- New policy: Allow super admins and circle admins to manage presets
CREATE POLICY "Admins can manage topic presets"
    ON circle_topic_presets FOR ALL
    TO authenticated
    USING (
        -- Super admins have full access
        is_super_admin(auth.uid())
        OR
        -- Circle admins can manage their circle's presets
        is_circle_admin(auth.uid(), circle_id)
    )
    WITH CHECK (
        -- Super admins have full access
        is_super_admin(auth.uid())
        OR
        -- Circle admins can manage their circle's presets
        is_circle_admin(auth.uid(), circle_id)
    );

-- ============================================================================
-- ADD SUPER ADMINS AS MEMBERS OF ALL CIRCLES
-- ============================================================================

-- This ensures super admins have implicit membership in all circles
-- Note: This is done via function, not actual table entries

-- Create a function to check if user can access a circle
-- (either as member or as super admin)
CREATE OR REPLACE FUNCTION can_access_circle(user_uuid UUID, circle_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins can access all circles
    IF is_super_admin(user_uuid) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is a member
    RETURN EXISTS (
        SELECT 1 FROM circle_members
        WHERE user_id = user_uuid
        AND circle_id = circle_uuid
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

