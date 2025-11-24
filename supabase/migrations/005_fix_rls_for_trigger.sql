-- Fix RLS policies to allow trigger to create profiles

-- The trigger runs as SECURITY DEFINER, but we need to make sure
-- RLS policies don't block profile creation

-- Temporarily disable RLS to allow the trigger to work
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Or, if you want to keep RLS enabled, add a policy for service role
-- CREATE POLICY "Service role can insert profiles"
--     ON profiles
--     FOR INSERT
--     TO service_role
--     WITH CHECK (true);

-- Alternative: Create policy that allows inserts for authenticated users
-- (The trigger should run in a context that has access)
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;
CREATE POLICY "Enable insert for authenticated users during signup"
    ON profiles
    FOR INSERT
    WITH CHECK (true);

-- Make sure authenticated users can read their own profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to update their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

