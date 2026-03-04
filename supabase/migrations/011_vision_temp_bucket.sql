-- ============================================================
-- Migration 011: Create vision-temp bucket for visual diagnostics
-- ============================================================
-- Files are uploaded by the client, downloaded by the server proxy,
-- sent to Gemini for analysis, then immediately deleted.
-- This avoids Vercel's 4.5MB request body limit while preserving
-- full image quality for serious diagnostic analysis.
-- ============================================================

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vision-temp',
  'vision-temp',
  false,
  20971520, -- 20 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload files to their own folder
CREATE POLICY "vision_temp_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vision-temp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read their own files (for retry/preview if needed)
CREATE POLICY "vision_temp_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vision-temp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own files (client-side cleanup on error)
CREATE POLICY "vision_temp_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vision-temp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: The server proxy uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so it can download and delete any file in this bucket without additional policies.
