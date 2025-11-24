-- Fix RLS policies for circles table to allow circle creation

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Circles are viewable by members" ON circles;
DROP POLICY IF EXISTS "Circle admins can update circles" ON circles;

-- Create new, simpler policies

-- Allow all authenticated users to view circles
CREATE POLICY "Allow authenticated users to view circles"
ON circles FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create circles
CREATE POLICY "Allow authenticated users to create circles"
ON circles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Allow circle creators to update their circles
CREATE POLICY "Allow circle creators to update their circles"
ON circles FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Allow circle creators to delete their circles
CREATE POLICY "Allow circle creators to delete their circles"
ON circles FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

