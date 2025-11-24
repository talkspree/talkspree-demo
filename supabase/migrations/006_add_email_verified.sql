-- Add email_verified boolean to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Create or replace function to sync email verification status
CREATE OR REPLACE FUNCTION sync_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user's email is confirmed in auth.users, update profiles
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
    UPDATE profiles
    SET email_verified = true
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to sync email verification
DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
CREATE TRIGGER on_auth_user_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_verification();

-- Set email_verified to true for existing users who already confirmed their email
UPDATE profiles
SET email_verified = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL
);

-- Add comment
COMMENT ON COLUMN profiles.email_verified IS 'Synced from auth.users.email_confirmed_at - used for real-time email confirmation detection';

