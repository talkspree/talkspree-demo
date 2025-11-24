-- Fix infinite recursion in circle_members RLS policies
-- This error happens when policies reference themselves

-- Drop ALL existing policies on circle_members
DROP POLICY IF EXISTS "Users can view circle members" ON circle_members;
DROP POLICY IF EXISTS "Users can view members of their circles" ON circle_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON circle_members;
DROP POLICY IF EXISTS "Users can insert themselves" ON circle_members;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON circle_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON circle_members;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON circle_members;
DROP POLICY IF EXISTS "Circle admins can manage members" ON circle_members;
DROP POLICY IF EXISTS "Public can view circle members" ON circle_members;

-- Simple, non-recursive policies

-- Allow all authenticated users to view circle members (no recursion)
CREATE POLICY "Allow authenticated users to view circle members"
ON circle_members FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own membership
CREATE POLICY "Allow users to insert their own membership"
ON circle_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own membership (role, etc)
CREATE POLICY "Allow users to update their own membership"
ON circle_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own membership (leave circle)
CREATE POLICY "Allow users to delete their own membership"
ON circle_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

