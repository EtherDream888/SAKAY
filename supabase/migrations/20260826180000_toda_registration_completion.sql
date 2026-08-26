-- ============================================================================
-- SAKAY Database Migration: TODA Registration Completion
-- Migration: 20260826180000_toda_registration_completion.sql
-- ============================================================================

-- 1. Add document URLs to public.toda
ALTER TABLE public.toda 
ADD COLUMN IF NOT EXISTS barangay_clearance_url TEXT,
ADD COLUMN IF NOT EXISTS accredited_drivers_url TEXT;

-- 2. Create the toda-accredited-driver-lists bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'toda-accredited-driver-lists',
    'toda-accredited-driver-lists',
    FALSE,
    10485760, -- 10MB
    ARRAY['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure barangay-clearances bucket is created (it should be from earlier migration, but just in case)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'barangay-clearances',
    'barangay-clearances',
    FALSE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Update RLS policies for the buckets
-- Drop existing policies if any
DROP POLICY IF EXISTS "storage_barangay_clearances_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_barangay_clearances_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_toda_accredited_driver_lists_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_toda_accredited_driver_lists_select" ON storage.objects;

-- Allow authenticated users to insert their own files (used during registration)
CREATE POLICY "storage_barangay_clearances_insert" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'barangay-clearances' AND auth.uid() = owner);

CREATE POLICY "storage_toda_accredited_driver_lists_insert" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'toda-accredited-driver-lists' AND auth.uid() = owner);

-- Allow LGU admins and the owner to read the files
CREATE POLICY "storage_barangay_clearances_select" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'barangay-clearances' AND (is_lgu_admin() OR auth.uid() = owner));

CREATE POLICY "storage_toda_accredited_driver_lists_select" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'toda-accredited-driver-lists' AND (is_lgu_admin() OR auth.uid() = owner));

-- 4. Update the register_toda_with_admin RPC function
DROP FUNCTION IF EXISTS register_toda_with_admin(
    VARCHAR, VARCHAR, VARCHAR, DATE, INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION,
    VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR
);

CREATE OR REPLACE FUNCTION register_toda_with_admin(
    p_toda_name VARCHAR(255),
    p_toda_acronym VARCHAR(50),
    p_registration_number VARCHAR(100),
    p_date_established DATE,
    p_active_drivers INTEGER,
    p_registered_tricycles INTEGER,
    p_terminal_latitude DOUBLE PRECISION,
    p_terminal_longitude DOUBLE PRECISION,
    p_terminal_location_name VARCHAR(255),
    p_barangay VARCHAR(100),
    p_service_coverage_area TEXT,
    p_president_name VARCHAR(255),
    p_admin_email VARCHAR(255),
    p_admin_contact_number VARCHAR(20),
    p_barangay_clearance_url TEXT,
    p_accredited_drivers_url TEXT
)
RETURNS UUID AS $$
DECLARE
    v_toda_id UUID;
    v_auth_user_id UUID;
BEGIN
    v_auth_user_id := auth.uid();
    
    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: User must be authenticated.';
    END IF;

    -- Create toda record
    INSERT INTO public.toda (
        toda_name,
        toda_acronym,
        registration_number,
        date_established,
        active_driver_count,
        registered_tricycle_count,
        terminal_latitude,
        terminal_longitude,
        barangay,
        service_coverage_area,
        president_name,
        president_contact,
        account_status,
        barangay_clearance_url,
        accredited_drivers_url
    ) VALUES (
        p_toda_name,
        p_toda_acronym,
        p_registration_number,
        p_date_established,
        p_active_drivers,
        p_registered_tricycles,
        p_terminal_latitude,
        p_terminal_longitude,
        p_barangay,
        p_service_coverage_area,
        p_president_name,
        p_admin_contact_number,
        'Pending Verification',
        p_barangay_clearance_url,
        p_accredited_drivers_url
    ) RETURNING toda_id INTO v_toda_id;

    -- Create toda_admin record linked to the toda and the caller's auth ID
    INSERT INTO public.toda_admin (
        auth_user_id,
        toda_id,
        full_name,
        email,
        contact_number,
        account_status
    ) VALUES (
        v_auth_user_id,
        v_toda_id,
        p_president_name,
        p_admin_email,
        p_admin_contact_number,
        'Active'
    );

    RETURN v_toda_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION register_toda_with_admin(
    VARCHAR, VARCHAR, VARCHAR, DATE, INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION,
    VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION register_toda_with_admin(
    VARCHAR, VARCHAR, VARCHAR, DATE, INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION,
    VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT
) TO authenticated;
