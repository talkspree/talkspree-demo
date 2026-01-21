-- Create storage bucket for circle assets (logos and cover images)
-- Similar to profile pictures bucket

-- ============================================================================
-- CREATE CIRCLE ASSETS BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'circle-assets',
    'circle-assets',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- ============================================================================
-- STORAGE POLICIES FOR CIRCLE ASSETS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Circle assets are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Circle admins can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Circle admins can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Circle admins can delete assets" ON storage.objects;

-- Allow public read access to circle assets
CREATE POLICY "Circle assets are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'circle-assets');

-- Allow authenticated users to upload circle assets
-- (We check admin status in the application layer)
CREATE POLICY "Authenticated users can upload circle assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'circle-assets');

-- Allow authenticated users to update circle assets
CREATE POLICY "Authenticated users can update circle assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'circle-assets');

-- Allow authenticated users to delete circle assets
CREATE POLICY "Authenticated users can delete circle assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'circle-assets');

