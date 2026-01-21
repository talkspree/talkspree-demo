-- Seed Admin Data Migration
-- Creates initial super admin and circle creator assignments

-- ============================================================================
-- UPDATE MENTOR THE YOUNG CIRCLE WITH DEFAULT DATA
-- ============================================================================

-- Update the circle with cover image and social links
UPDATE circles
SET 
    cover_image_url = NULL,
    social_links = '{
        "website": "https://mentortheyoung.bg",
        "instagram": "https://instagram.com/mentortheyoung",
        "facebook": "https://facebook.com/mentortheyoung",
        "linkedin": "https://linkedin.com/company/mentortheyoung",
        "email": "contact@mentortheyoung.bg"
    }'::jsonb
WHERE name = 'Mentor the Young';

-- ============================================================================
-- CREATE DEFAULT ROLES FOR MENTOR THE YOUNG CIRCLE
-- ============================================================================

-- First, get the circle ID
DO $$
DECLARE
    mty_circle_id UUID;
BEGIN
    SELECT id INTO mty_circle_id FROM circles WHERE name = 'Mentor the Young' LIMIT 1;
    
    IF mty_circle_id IS NOT NULL THEN
        -- Insert default roles if they don't exist
        INSERT INTO circle_roles (circle_id, name, description, color, display_order)
        VALUES 
            (mty_circle_id, 'Mentor', 'Experienced professionals who guide mentees', '#6366f1', 1),
            (mty_circle_id, 'Mentee', 'Young professionals seeking guidance', '#8b5cf6', 2),
            (mty_circle_id, 'Alumni', 'Former participants of the program', '#a855f7', 3)
        ON CONFLICT (circle_id, name) DO NOTHING;
        
        -- Insert default topic presets
        INSERT INTO circle_topic_presets (circle_id, name, description, topics, custom_questions, display_order)
        VALUES 
            (mty_circle_id, 'Career Guidance', 'Discussions about career paths and professional growth', 
             ARRAY['career', 'professional-growth'], 
             ARRAY['What career advice would you give your younger self?', 'How did you choose your career path?'], 
             1),
            (mty_circle_id, 'Personal Development', 'Self-improvement and personal growth topics', 
             ARRAY['self-improvement', 'goals'], 
             ARRAY['What habit has had the biggest impact on your life?', 'How do you stay motivated?'], 
             2),
            (mty_circle_id, 'Networking', 'Building professional connections and relationships', 
             ARRAY['networking', 'connections'], 
             ARRAY['How do you approach networking events?', 'What makes a meaningful professional connection?'], 
             3)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- ASSIGN SUPER ADMINS: talkspree.app@gmail.com AND mihail.hummel@gmail.com
-- ============================================================================

DO $$
DECLARE
    super_admin_user_id UUID;
BEGIN
    -- Find talkspree.app@gmail.com
    SELECT id INTO super_admin_user_id 
    FROM profiles 
    WHERE email = 'talkspree.app@gmail.com' 
    LIMIT 1;
    
    IF super_admin_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, admin_type, notes)
        VALUES (super_admin_user_id, 'super_admin', 'Initial platform super admin')
        ON CONFLICT (user_id) DO UPDATE SET admin_type = 'super_admin';
        
        RAISE NOTICE 'Super admin assigned to user: %', super_admin_user_id;
    ELSE
        RAISE NOTICE 'User talkspree.app@gmail.com not found. Super admin will be created when user registers.';
    END IF;
END $$;

DO $$
DECLARE
    super_admin_user_id UUID;
BEGIN
    -- Find mihail.hummel@gmail.com
    SELECT id INTO super_admin_user_id 
    FROM profiles 
    WHERE email = 'mihail.hummel@gmail.com' 
    LIMIT 1;
    
    IF super_admin_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, admin_type, notes)
        VALUES (super_admin_user_id, 'super_admin', 'Co-founder super admin')
        ON CONFLICT (user_id) DO UPDATE SET admin_type = 'super_admin';
        
        RAISE NOTICE 'Super admin assigned to user: %', super_admin_user_id;
    ELSE
        RAISE NOTICE 'User mihail.hummel@gmail.com not found. Super admin will be created when user registers.';
    END IF;
END $$;

-- ============================================================================
-- ASSIGN CIRCLE CREATOR: mihail.hummel@gmail.com for Mentor The Young
-- ============================================================================

DO $$
DECLARE
    creator_user_id UUID;
    mty_circle_id UUID;
BEGIN
    -- Find the user by email
    SELECT id INTO creator_user_id 
    FROM profiles 
    WHERE email = 'mihail.hummel@gmail.com' 
    LIMIT 1;
    
    -- Find the circle
    SELECT id INTO mty_circle_id 
    FROM circles 
    WHERE name = 'Mentor the Young' 
    LIMIT 1;
    
    IF creator_user_id IS NOT NULL AND mty_circle_id IS NOT NULL THEN
        -- Update circle_members to set admin_type to creator
        UPDATE circle_members
        SET admin_type = 'creator', role = 'admin'
        WHERE user_id = creator_user_id
        AND circle_id = mty_circle_id;
        
        -- If not a member, add them as creator
        INSERT INTO circle_members (circle_id, user_id, role, admin_type, status)
        VALUES (mty_circle_id, creator_user_id, 'admin', 'creator', 'active')
        ON CONFLICT (circle_id, user_id) 
        DO UPDATE SET admin_type = 'creator', role = 'admin';
        
        -- Also update the circles table to reflect the creator
        UPDATE circles
        SET created_by = creator_user_id
        WHERE id = mty_circle_id;
        
        RAISE NOTICE 'Circle creator assigned: user % for circle %', creator_user_id, mty_circle_id;
    ELSE
        IF creator_user_id IS NULL THEN
            RAISE NOTICE 'User mihail.hummel@gmail.com not found. Circle creator will be assigned when user registers.';
        END IF;
        IF mty_circle_id IS NULL THEN
            RAISE NOTICE 'Mentor the Young circle not found.';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- CREATE TRIGGER TO AUTO-ASSIGN SUPER ADMIN ON USER CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_auto_assign_super_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-assign super admin for designated emails
    IF NEW.email = 'talkspree.app@gmail.com' OR NEW.email = 'mihail.hummel@gmail.com' THEN
        INSERT INTO platform_admins (user_id, admin_type, notes)
        VALUES (NEW.id, 'super_admin', 'Auto-assigned platform super admin')
        ON CONFLICT (user_id) DO UPDATE SET admin_type = 'super_admin';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS auto_assign_super_admin ON profiles;
CREATE TRIGGER auto_assign_super_admin
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_auto_assign_super_admin();

-- ============================================================================
-- CREATE TRIGGER TO AUTO-ASSIGN CIRCLE CREATOR ON USER CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_auto_assign_circle_creator()
RETURNS TRIGGER AS $$
DECLARE
    mty_circle_id UUID;
BEGIN
    -- Auto-assign circle creator for mihail.hummel@gmail.com
    IF NEW.email = 'mihail.hummel@gmail.com' THEN
        SELECT id INTO mty_circle_id FROM circles WHERE name = 'Mentor the Young' LIMIT 1;
        
        IF mty_circle_id IS NOT NULL THEN
            -- Add as circle member with creator status
            INSERT INTO circle_members (circle_id, user_id, role, admin_type, status)
            VALUES (mty_circle_id, NEW.id, 'admin', 'creator', 'active')
            ON CONFLICT (circle_id, user_id) 
            DO UPDATE SET admin_type = 'creator', role = 'admin';
            
            -- Update the circles table
            UPDATE circles SET created_by = NEW.id WHERE id = mty_circle_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS auto_assign_circle_creator ON profiles;
CREATE TRIGGER auto_assign_circle_creator
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_auto_assign_circle_creator();

