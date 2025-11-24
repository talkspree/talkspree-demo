-- Add onboarding_completed field to track if user has completed profile setup
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
ON profiles(onboarding_completed);

-- Set onboarding_completed to true for users who have filled out their profiles
UPDATE profiles
SET onboarding_completed = true
WHERE first_name IS NOT NULL 
  AND first_name != ''
  AND last_name IS NOT NULL 
  AND last_name != '';

-- Add comment
COMMENT ON COLUMN profiles.onboarding_completed IS 'Indicates whether user has completed the onboarding process';

