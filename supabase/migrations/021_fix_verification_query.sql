-- Fix RLS to allow querying profiles by email for verification
-- The profile exists but RLS is blocking the query

-- Drop all existing SELECT policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to check their email verification" ON profiles;
DROP POLICY IF EXISTS "Allow profile lookup for verification" ON profiles;
DROP POLICY IF EXISTS "Users can read own email verification status" ON profiles;

-- Create a policy that allows ANYONE (including anonymous) to read profiles
-- This is needed for email verification during signup
CREATE POLICY "Allow profile read for verification"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Keep update restricted to own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Allow insert for authenticated users (for signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;
CREATE POLICY "Allow profile insert"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

