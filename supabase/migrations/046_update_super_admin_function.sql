-- Update is_super_admin function to include email-based fallback
-- This ensures super admin status works even if platform_admins table has issues

CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Check platform_admins table first
    IF EXISTS (
        SELECT 1 FROM platform_admins
        WHERE user_id = user_uuid
        AND admin_type = 'super_admin'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Fallback: Check if user's email is in the super admin list
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = user_uuid;
    
    IF user_email IN ('talkspree.app@gmail.com', 'mihail.hummel@gmail.com') THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

