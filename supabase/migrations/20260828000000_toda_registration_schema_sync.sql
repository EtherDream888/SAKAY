-- ============================================================================
-- SAKAY Database Migration: Synchronize TODA Registration Schema & Coordinates
-- Migration: 20260828000000_toda_registration_schema_sync.sql
-- ============================================================================

-- 1. Ensure all registration columns exist on public.toda
ALTER TABLE public.toda 
ADD COLUMN IF NOT EXISTS toda_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS toda_acronym VARCHAR(50),
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS barangay VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_established DATE,
ADD COLUMN IF NOT EXISTS service_coverage_area TEXT,
ADD COLUMN IF NOT EXISTS terminal_latitude DOUBLE PRECISION DEFAULT 13.4117,
ADD COLUMN IF NOT EXISTS terminal_longitude DOUBLE PRECISION DEFAULT 121.1803,
ADD COLUMN IF NOT EXISTS president_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS president_contact VARCHAR(50),
ADD COLUMN IF NOT EXISTS vice_president_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS vice_president_contact VARCHAR(50),
ADD COLUMN IF NOT EXISTS secretary_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS secretary_contact VARCHAR(50),
ADD COLUMN IF NOT EXISTS treasurer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS treasurer_contact VARCHAR(50),
ADD COLUMN IF NOT EXISTS barangay_clearance_url TEXT,
ADD COLUMN IF NOT EXISTS accredited_drivers_url TEXT,
ADD COLUMN IF NOT EXISTS active_driver_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS registered_tricycle_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'Pending Verification',
ADD COLUMN IF NOT EXISTS decline_reason TEXT,
ADD COLUMN IF NOT EXISTS resubmission_reason TEXT;

-- 2. Ensure RLS policies allow insertion during registration
DROP POLICY IF EXISTS "allow_toda_registration_insert" ON public.toda;
CREATE POLICY "allow_toda_registration_insert"
ON public.toda FOR INSERT TO public, anon, authenticated
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "allow_toda_admin_registration_insert" ON public.toda_admin;
CREATE POLICY "allow_toda_admin_registration_insert"
ON public.toda_admin FOR INSERT TO public, anon, authenticated
WITH CHECK (TRUE);

-- 3. Ensure Storage Buckets exist and are public for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('barangay-clearances', 'barangay-clearances', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('toda-accredited-driver-lists', 'toda-accredited-driver-lists', TRUE, 10485760, ARRAY['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
    public = TRUE,
    file_size_limit = 10485760;

-- 4. Storage Policies for document uploads
DROP POLICY IF EXISTS "allow_public_upload_docs" ON storage.objects;
CREATE POLICY "allow_public_upload_docs" 
ON storage.objects FOR INSERT 
TO public, anon, authenticated
WITH CHECK (bucket_id IN ('barangay-clearances', 'toda-accredited-driver-lists'));

DROP POLICY IF EXISTS "allow_public_read_docs" ON storage.objects;
CREATE POLICY "allow_public_read_docs" 
ON storage.objects FOR SELECT 
TO public, anon, authenticated
USING (bucket_id IN ('barangay-clearances', 'toda-accredited-driver-lists'));
