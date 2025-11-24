-- Allow users to read their own email_verified status
-- (RLS should already be enabled on profiles table from previous migrations)

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read own email verification status" ON profiles;

-- Create policy to allow users to read their own email_verified field
CREATE POLICY "Users can read own email verification status"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Also ensure users can see their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to check email verification during signup
-- This is needed for the modal to poll the status
DROP POLICY IF EXISTS "Allow users to check their email verification" ON profiles;
CREATE POLICY "Allow users to check their email verification"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

