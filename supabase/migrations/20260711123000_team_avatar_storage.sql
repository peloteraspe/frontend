-- TEAM-107: Team avatar storage bucket and server-side constraints.
-- Avatars are uploaded by the application backend after validating extension,
-- MIME type, size and image signature. Storage also enforces size/MIME.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'team-avatars',
  'team-avatars',
  true,
  307200,
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'team_avatars_public_select'
  ) THEN
    CREATE POLICY team_avatars_public_select
      ON storage.objects
      AS PERMISSIVE
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'team-avatars');
  END IF;
END $$;

-- Allows public reads for team avatar images. Writes are handled through the
-- backend service role. Avoid COMMENT ON POLICY here because storage.objects is
-- owned by the Supabase storage role in local environments.
