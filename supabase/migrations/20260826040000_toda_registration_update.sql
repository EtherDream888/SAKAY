-- Update TODA registration requirements: Remove obsolete officers and contacts
-- Keep only the President as the sole admin, as per requirements.

-- 1. Drop obsolete columns from public.toda
ALTER TABLE public.toda 
DROP COLUMN IF EXISTS vice_president_name,
DROP COLUMN IF EXISTS vice_president_contact,
DROP COLUMN IF EXISTS secretary_name,
DROP COLUMN IF EXISTS secretary_contact,
DROP COLUMN IF EXISTS treasurer_name,
DROP COLUMN IF EXISTS treasurer_contact,
DROP COLUMN IF EXISTS contact_number,
DROP COLUMN IF EXISTS email;

-- 2. Update the RPC function to match new schema
-- First, drop the old function since the signature changes
DROP FUNCTION IF EXISTS register_toda_with_admin(
    VARCHAR, VARCHAR, VARCHAR, DATE, DOUBLE PRECISION, DOUBLE PRECISION,
    VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR,
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR,
    VARCHAR, VARCHAR, VARCHAR
);

-- Recreate with the precise required fields
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
    p_admin_contact_number VARCHAR(20)
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
        account_status
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
        'Pending Verification'
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
    VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION register_toda_with_admin(
    VARCHAR, VARCHAR, VARCHAR, DATE, INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION,
    VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR
) TO authenticated;
