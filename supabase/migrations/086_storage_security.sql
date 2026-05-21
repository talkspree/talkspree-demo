-- 086 — SECURITY FIX (High H4): storage buckets
--
-- Problems (verified live):
--   * 'avatars' bucket was public with NO file_size_limit and NO allowed_mime_types
--     → any authenticated user could upload unlimited files of any type/size
--     (storage + egress cost; arbitrary content hosting on your domain).
--   * Both buckets' UPDATE/DELETE policies keyed only on bucket_id (not ownership)
--     → any authenticated user could overwrite or delete ANY other user's files.
--
-- Upload paths (for reference): avatars -> 'profile-pictures/<uid>-<ts>.<ext>',
-- circle-assets -> '<circleId>/<type>_<ts>.jpg'. The avatar path does not put the
-- uid in a folder, so ownership is enforced via storage.objects.owner (auto-set to
-- the uploader's uid), which is reliable for both buckets.

-- 1) Constrain the avatars bucket (circle-assets already has 5MB + image mime list).
UPDATE storage.buckets
   SET file_size_limit = 2097152,  -- 2 MB
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
 WHERE id = 'avatars';

-- 2) Owner-scoped UPDATE/DELETE. Public SELECT and authenticated INSERT are kept
--    (owner is assigned automatically on insert).
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Owners can delete their avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Owners can update their avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can delete circle assets" ON storage.objects;
CREATE POLICY "Owners can delete circle assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'circle-assets' AND owner = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update circle assets" ON storage.objects;
CREATE POLICY "Owners can update circle assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'circle-assets' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'circle-assets' AND owner = auth.uid());
