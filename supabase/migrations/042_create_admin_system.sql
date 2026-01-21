-- Admin System Migration
-- Creates the admin hierarchy: Super Admin > Circle Creator > Circle Admin

-- ============================================================================
-- PLATFORM ADMINS TABLE
-- Stores super admins who have global platform access
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    admin_type TEXT NOT NULL CHECK (admin_type IN ('super_admin')),
    granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_platform_admins_user_id ON platform_admins(user_id);

-- Enable RLS
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can view all platform admins
CREATE POLICY "Super admins can view platform admins"
    ON platform_admins FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM platform_admins pa
            WHERE pa.user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- ============================================================================
-- UPDATE CIRCLES TABLE
-- Add cover image, social links as JSONB, and other fields
-- ============================================================================
ALTER TABLE circles 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- UPDATE CIRCLE_MEMBERS TABLE
-- Add admin_type to distinguish between creators and admins
-- Existing role column stays for 'admin', 'moderator', 'member' 
-- New admin_type for 'creator', 'circle_admin', NULL
-- ============================================================================
ALTER TABLE circle_members 
ADD COLUMN IF NOT EXISTS admin_type TEXT CHECK (admin_type IN ('creator', 'circle_admin') OR admin_type IS NULL);

-- ============================================================================
-- CIRCLE ROLES TABLE
-- Custom roles defined for each circle (Mentor, Mentee, Alumni, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS circle_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(circle_id, name)
);

CREATE INDEX idx_circle_roles_circle_id ON circle_roles(circle_id);

-- Enable RLS
ALTER TABLE circle_roles ENABLE ROW LEVEL SECURITY;

-- Circle members can view roles for their circles
CREATE POLICY "Circle members can view circle roles"
    ON circle_roles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.circle_id = circle_roles.circle_id
            AND cm.user_id = auth.uid()
        )
    );

-- Circle admins/creators can manage roles
CREATE POLICY "Circle admins can manage roles"
    ON circle_roles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.circle_id = circle_roles.circle_id
            AND cm.user_id = auth.uid()
            AND (cm.admin_type IN ('creator', 'circle_admin') OR cm.role = 'admin')
        )
        OR
        EXISTS (
            SELECT 1 FROM platform_admins pa
            WHERE pa.user_id = auth.uid()
        )
    );

-- ============================================================================
-- CIRCLE MEMBER ROLES TABLE
-- Links circle members to their assigned circle role
-- ============================================================================
CREATE TABLE IF NOT EXISTS circle_member_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circle_member_id UUID NOT NULL REFERENCES circle_members(id) ON DELETE CASCADE,
    circle_role_id UUID NOT NULL REFERENCES circle_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE(circle_member_id)
);

CREATE INDEX idx_circle_member_roles_member_id ON circle_member_roles(circle_member_id);
CREATE INDEX idx_circle_member_roles_role_id ON circle_member_roles(circle_role_id);

-- Enable RLS
ALTER TABLE circle_member_roles ENABLE ROW LEVEL SECURITY;

-- Circle members can view role assignments
CREATE POLICY "Circle members can view role assignments"
    ON circle_member_roles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM circle_members cm
            JOIN circle_members target_cm ON target_cm.id = circle_member_roles.circle_member_id
            WHERE cm.circle_id = target_cm.circle_id
            AND cm.user_id = auth.uid()
        )
    );

-- Circle admins can manage role assignments
CREATE POLICY "Circle admins can manage role assignments"
    ON circle_member_roles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM circle_members cm
            JOIN circle_members target_cm ON target_cm.id = circle_member_roles.circle_member_id
            WHERE cm.circle_id = target_cm.circle_id
            AND cm.user_id = auth.uid()
            AND (cm.admin_type IN ('creator', 'circle_admin') OR cm.role = 'admin')
        )
        OR
        EXISTS (
            SELECT 1 FROM platform_admins pa
            WHERE pa.user_id = auth.uid()
        )
    );

-- ============================================================================
-- CIRCLE TOPIC PRESETS TABLE
-- Custom topic presets for each circle
-- ============================================================================
CREATE TABLE IF NOT EXISTS circle_topic_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    topics TEXT[] NOT NULL DEFAULT '{}',
    custom_questions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_circle_topic_presets_circle_id ON circle_topic_presets(circle_id);

-- Enable RLS
ALTER TABLE circle_topic_presets ENABLE ROW LEVEL SECURITY;

-- Circle members can view topic presets
CREATE POLICY "Circle members can view topic presets"
    ON circle_topic_presets FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.circle_id = circle_topic_presets.circle_id
            AND cm.user_id = auth.uid()
        )
    );

-- Circle admins can manage topic presets
CREATE POLICY "Circle admins can manage topic presets"
    ON circle_topic_presets FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.circle_id = circle_topic_presets.circle_id
            AND cm.user_id = auth.uid()
            AND (cm.admin_type IN ('creator', 'circle_admin') OR cm.role = 'admin')
        )
        OR
        EXISTS (
            SELECT 1 FROM platform_admins pa
            WHERE pa.user_id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM platform_admins
        WHERE user_id = user_uuid
        AND admin_type = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is a circle creator
CREATE OR REPLACE FUNCTION is_circle_creator(user_uuid UUID, circle_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM circle_members
        WHERE user_id = user_uuid
        AND circle_id = circle_uuid
        AND admin_type = 'creator'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is a circle admin (creator or admin)
CREATE OR REPLACE FUNCTION is_circle_admin(user_uuid UUID, circle_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM circle_members
        WHERE user_id = user_uuid
        AND circle_id = circle_uuid
        AND (admin_type IN ('creator', 'circle_admin') OR role = 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has any admin access to a circle
CREATE OR REPLACE FUNCTION has_circle_admin_access(user_uuid UUID, circle_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins have access to all circles
    IF is_super_admin(user_uuid) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is a circle admin
    RETURN is_circle_admin(user_uuid, circle_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's admin type for a circle
CREATE OR REPLACE FUNCTION get_user_circle_admin_type(user_uuid UUID, circle_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    admin_type_result TEXT;
BEGIN
    -- Check if super admin first
    IF is_super_admin(user_uuid) THEN
        RETURN 'super_admin';
    END IF;
    
    -- Check circle membership admin type
    SELECT admin_type INTO admin_type_result
    FROM circle_members
    WHERE user_id = user_uuid
    AND circle_id = circle_uuid;
    
    RETURN admin_type_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's display role in a circle
CREATE OR REPLACE FUNCTION get_user_circle_role(user_uuid UUID, circle_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    role_name TEXT;
    member_admin_type TEXT;
BEGIN
    -- Get the member record
    SELECT cm.admin_type INTO member_admin_type
    FROM circle_members cm
    WHERE cm.user_id = user_uuid
    AND cm.circle_id = circle_uuid;
    
    -- Super admins always show as Super Admin
    IF is_super_admin(user_uuid) THEN
        RETURN 'Super Admin';
    END IF;
    
    -- Circle creators show as Creator
    IF member_admin_type = 'creator' THEN
        RETURN 'Creator';
    END IF;
    
    -- Circle admins show as Admin
    IF member_admin_type = 'circle_admin' THEN
        RETURN 'Admin';
    END IF;
    
    -- Otherwise, get their assigned role
    SELECT cr.name INTO role_name
    FROM circle_member_roles cmr
    JOIN circle_members cm ON cm.id = cmr.circle_member_id
    JOIN circle_roles cr ON cr.id = cmr.circle_role_id
    WHERE cm.user_id = user_uuid
    AND cm.circle_id = circle_uuid;
    
    -- Return the role name or 'Member' as default
    RETURN COALESCE(role_name, 'Member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE CIRCLES RLS POLICIES FOR ADMIN ACCESS
-- ============================================================================

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Circle admins can update circles" ON circles;

-- Create new comprehensive update policy
CREATE POLICY "Circle admins can update circles"
    ON circles FOR UPDATE
    TO authenticated
    USING (
        has_circle_admin_access(auth.uid(), id)
    );

-- Allow super admins to delete circles
CREATE POLICY "Super admins can delete circles"
    ON circles FOR DELETE
    TO authenticated
    USING (
        is_super_admin(auth.uid())
        OR is_circle_creator(auth.uid(), id)
    );

