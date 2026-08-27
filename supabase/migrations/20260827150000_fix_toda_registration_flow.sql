-- ============================================================================
-- SAKAY Database Migration: Fix TODA Registration & Storage Policies
-- Migration: 20260827150000_fix_toda_registration_flow.sql
-- ============================================================================

-- 1. Ensure columns exist on public.toda
ALTER TABLE public.toda 
ADD COLUMN IF NOT EXISTS barangay_clearance_url TEXT,
ADD COLUMN IF NOT EXISTS accredited_drivers_url TEXT,
ADD COLUMN IF NOT EXISTS decline_reason TEXT,
ADD COLUMN IF NOT EXISTS resubmission_reason TEXT;

-- 2. Ensure Storage Buckets exist and are accessible for uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('barangay-clearances', 'barangay-clearances', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('toda-accredited-driver-lists', 'toda-accredited-driver-lists', TRUE, 10485760, ARRAY['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET 
    public = TRUE,
    file_size_limit = 10485760;

-- 3. Storage Policies to allow public/authenticated insert and read for registration documents
DROP POLICY IF EXISTS "allow_public_upload_clearance" ON storage.objects;
CREATE POLICY "allow_public_upload_clearance" 
ON storage.objects FOR INSERT 
TO public, anon, authenticated
WITH CHECK (bucket_id IN ('barangay-clearances', 'toda-accredited-driver-lists'));

DROP POLICY IF EXISTS "allow_public_read_clearance" ON storage.objects;
CREATE POLICY "allow_public_read_clearance" 
ON storage.objects FOR SELECT 
TO public, anon, authenticated
USING (bucket_id IN ('barangay-clearances', 'toda-accredited-driver-lists'));

-- 4. Enable public / anon insertion into public.toda for new applications (Pending Verification only)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'toda' AND policyname = 'allow_toda_registration_insert'
    ) THEN
        CREATE POLICY "allow_toda_registration_insert"
        ON public.toda FOR INSERT TO public, anon, authenticated
        WITH CHECK (account_status = 'Pending Verification');
    END IF;
END $$;

-- 5. Enable public / anon insertion into public.toda_admin for linked registration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'toda_admin' AND policyname = 'allow_toda_admin_registration_insert'
    ) THEN
        CREATE POLICY "allow_toda_admin_registration_insert"
        ON public.toda_admin FOR INSERT TO public, anon, authenticated
        WITH CHECK (TRUE);
    END IF;
END $$;

-- 6. Drop any existing function overloads to ensure uniqueness
DROP FUNCTION IF EXISTS public.register_toda_with_admin(VARCHAR, VARCHAR, VARCHAR, DATE, INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.register_toda_with_admin(VARCHAR, VARCHAR, VARCHAR, DATE, INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, UUID);

-- Update register_toda_with_admin RPC to handle both authenticated and unauthenticated callers
CREATE OR REPLACE FUNCTION public.register_toda_with_admin(
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
    p_barangay_clearance_url TEXT DEFAULT NULL,
    p_accredited_drivers_url TEXT DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_toda_id UUID;
    v_target_user_id UUID;
BEGIN
    v_target_user_id := COALESCE(p_auth_user_id, auth.uid());
    
    -- Insert into public.toda
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

    -- If we have an auth user ID, link to public.toda_admin
    IF v_target_user_id IS NOT NULL THEN
        INSERT INTO public.toda_admin (
            auth_user_id,
            toda_id,
            full_name,
            email,
            contact_number,
            account_status
        ) VALUES (
            v_target_user_id,
            v_toda_id,
            p_president_name,
            p_admin_email,
            p_admin_contact_number,
            'Active'
        )
        ON CONFLICT (auth_user_id) DO UPDATE SET
            toda_id = v_toda_id,
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            contact_number = EXCLUDED.contact_number;
    END IF;

    -- Record initial audit log
    INSERT INTO public.audit_log (
        action_type,
        target_id,
        details,
        performed_at
    ) VALUES (
        'TODA_REGISTRATION_SUBMITTED',
        v_toda_id::text,
        'Submitted new accreditation application for ' || p_toda_name || ' (' || COALESCE(p_toda_acronym, 'N/A') || ') in Brgy. ' || p_barangay,
        now()
    );

    RETURN v_toda_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.register_toda_with_admin(
    VARCHAR, VARCHAR, VARCHAR, DATE, INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, UUID
) TO public, anon, authenticated;
