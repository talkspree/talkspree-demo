-- Add verification code columns to profiles table
-- Used for 4-digit email verification during signup

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_code TEXT,
ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster verification lookups
CREATE INDEX IF NOT EXISTS idx_profiles_verification_code ON profiles(verification_code) 
WHERE verification_code IS NOT NULL;

-- Add comment
COMMENT ON COLUMN profiles.verification_code IS '4-digit code for email verification during signup';
COMMENT ON COLUMN profiles.verification_code_expires_at IS 'Expiration timestamp for the verification code (typically 10 minutes)';

