-- Fix RLS to allow email verification during signup
-- Users need to query their profile by email even when not fully authenticated

-- Drop the restrictive policy that only allows authenticated users
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to check their email verification" ON profiles;

-- Create a policy that allows anyone (including anonymous) to read profiles
-- This is needed for email verification during signup when user isn't authenticated yet
-- In production, you might want to restrict this further, but for now this is needed
CREATE POLICY "Allow profile lookup for verification"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Keep the update policy restricted to own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

