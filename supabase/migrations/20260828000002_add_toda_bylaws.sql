-- ============================================================================
-- SAKAY Database Migration: Add Internal Bylaws Document Support for TODA
-- Migration: 20260828000002_add_toda_bylaws.sql
-- ============================================================================

-- 1. Add bylaws_url column to public.toda
ALTER TABLE public.toda 
ADD COLUMN IF NOT EXISTS bylaws_url TEXT;

-- 2. Create toda-bylaws Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('toda-bylaws', 'toda-bylaws', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
    public = TRUE,
    file_size_limit = 10485760;

-- 3. Storage Policies for toda-bylaws bucket
DROP POLICY IF EXISTS "allow_public_upload_bylaws" ON storage.objects;
CREATE POLICY "allow_public_upload_bylaws" 
ON storage.objects FOR INSERT 
TO public, anon, authenticated
WITH CHECK (bucket_id IN ('barangay-clearances', 'toda-accredited-driver-lists', 'toda-bylaws'));

DROP POLICY IF EXISTS "allow_public_read_bylaws" ON storage.objects;
CREATE POLICY "allow_public_read_bylaws" 
ON storage.objects FOR SELECT 
TO public, anon, authenticated
USING (bucket_id IN ('barangay-clearances', 'toda-accredited-driver-lists', 'toda-bylaws'));
