-- Create function to verify user email (bypasses RLS)
-- This is needed because regular users cannot update auth.users table

CREATE OR REPLACE FUNCTION verify_user_email(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the email_confirmed_at in auth.users
  -- Note: confirmed_at is a generated column and will be set automatically
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = user_id;
  
  -- Also update profiles table
  UPDATE profiles
  SET email_verified = true
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_email(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION verify_user_email IS 'Verifies a user email after 4-digit code confirmation. SECURITY DEFINER allows updating auth.users.';

