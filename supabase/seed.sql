-- ============================================================================
-- SAKAY PROJECT — POSTGRESQL / SUPABASE SEED DATA SCRIPT
-- City: Calapan City, Oriental Mindoro
-- Purpose:
--   Populates the database with realistic initial data for development,
--   testing, and capstone demonstrations across LGU Admin, TODA Admin,
--   Driver PWA, and Passenger PWA applications.
-- ============================================================================

-- 1. CLEAN EXISTING SEED DATA (IF RE-RUNNING)
TRUNCATE TABLE 
    public.audit_log,
    public.announcement,
    public.incident_report,
    public.rating,
    public.gps_log,
    public.dispatch_attempt,
    public.booking,
    public.driver_verification,
    public.driver,
    public.passenger,
    public.toda_admin,
    public.lgu_admin,
    public.fare_matrix,
    public.toda
CASCADE;

-- ============================================================================
-- 2. ACCREDITED TODA ORGANIZATIONS (Calapan City)
-- ============================================================================

INSERT INTO public.toda (
    toda_id,
    toda_name,
    toda_acronym,
    registration_number,
    date_established,
    terminal_latitude,
    terminal_longitude,
    barangay,
    service_coverage_area,
    contact_number,
    email,
    president_name,
    president_contact,
    vice_president_name,
    vice_president_contact,
    secretary_name,
    secretary_contact,
    treasurer_name,
    treasurer_contact,
    registered_tricycle_count,
    active_driver_count,
    certificate_number,
    certificate_expiry,
    account_status
) VALUES 
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Calapan Central TODA',
    'CCTODA',
    'CAL-TODA-2024-001',
    '2012-03-15',
    13.4115,
    121.1803,
    'San Vicente Central',
    'Calapan Public Market, City Hall, J.P. Rizal St., San Vicente West',
    '+63 917 100 2001',
    'cctoda.calapan@gmail.com',
    'Roberto "Berting" Alcantara',
    '+63 917 555 1001',
    'Eduardo M. Perez',
    '+63 917 555 1002',
    'Leticia Cruz-Reyes',
    '+63 917 555 1003',
    'Mario D. Hernandez',
    '+63 917 555 1004',
    24,
    18,
    'CERT-LGU-2026-001',
    '2026-12-31T23:59:59Z',
    'Active'
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'Balite-Lumangbayan TODA',
    'BLTODA',
    'CAL-TODA-2024-002',
    '2015-08-20',
    13.4021,
    121.1712,
    'Balite',
    'Barangay Balite, Lumangbayan Highway, Calapan Port Access Road',
    '+63 918 200 3002',
    'bltoda.association@gmail.com',
    'Arnaldo V. Mendoza',
    '+63 918 555 2001',
    'Crisanto B. Salazar',
    '+63 918 555 2002',
    'Elena M. Bautista',
    '+63 918 555 2003',
    'Ramon S. Dimaandal',
    '+63 918 555 2004',
    35,
    28,
    'CERT-LGU-2026-002',
    '2026-12-31T23:59:59Z',
    'Active'
),
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'San Vicente East Drivers Association',
    'SVTODA',
    'CAL-TODA-2025-003',
    '2018-11-10',
    13.4189,
    121.1894,
    'San Vicente East',
    'San Vicente East, Calapan Pier Road, Provincial Capitol Complex',
    '+63 919 300 4003',
    'svtoda.officials@gmail.com',
    'Nestor G. Villanueva',
    '+63 919 555 3001',
    'Guillermo C. Ramos',
    '+63 919 555 3002',
    'Corazon F. Ilagan',
    '+63 919 555 3003',
    'Danilo P. Tolentino',
    '+63 919 555 3004',
    20,
    14,
    'CERT-LGU-2026-003',
    '2026-12-31T23:59:59Z',
    'Active'
);

-- ============================================================================
-- 3. MUNICIPAL FARE MATRIX ORDINANCES
-- ============================================================================

INSERT INTO public.fare_matrix (
    fare_matrix_id,
    base_fare,
    base_distance_km,
    succeeding_rate,
    effective_timestamp,
    is_active
) VALUES 
(
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01',
    15.00,
    2.00,
    1.00,
    '2022-06-01T00:00:00Z',
    TRUE
),
(
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f02',
    12.00,
    2.00,
    0.75,
    '2019-01-01T00:00:00Z',
    FALSE
);

-- ============================================================================
-- 4. ANNOUNCEMENTS (City Bulletins & TODA Notices)
-- ============================================================================

INSERT INTO public.announcement (
    announcement_id,
    toda_id,
    title,
    message
) VALUES 
(
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Annual MTOP Franchise Renewal Notice',
    'All registered CCTODA tricycle operators and drivers must renew their MTOP permits and Barangay Clearances at the City Transport Office before June 30, 2026.'
),
(
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Strict Adherence to Regulated Tariffs',
    'Drivers are reminded that the standard base fare is ₱15.00 for the first 2.0 km. Overcharging complaints will result in immediate policy strikes.'
);

-- ============================================================================
-- 5. AUDIT LOG (Immutable Administrative Ledger)
-- ============================================================================

INSERT INTO public.audit_log (
    log_id,
    action_type,
    details
) VALUES 
(
    gen_random_uuid(),
    'SYSTEM_INITIALIZED',
    'Database seed script executed. Calapan City TODA registries, active fare matrix, and baseline parameters established.'
),
(
    gen_random_uuid(),
    'FARE_MATRIX_VERIFIED',
    'Verified City Ordinance No. 118, Series of 2022 active tariff matrix: ₱15.00 base (2.0 km), ₱1.00/km succeeding.'
),
(
    gen_random_uuid(),
    'TODA_ACCREDITATION_CONFIRMED',
    'Confirmed municipal accreditation for CCTODA (CAL-TODA-2024-001) with 24 authorized units.'
);
-- ============================================================================
-- SEED LGU ADMIN ACCOUNT (TESTING)
-- ============================================================================
-- Purpose:
-- This script safely inserts the temporary LGU administrator account (admin@gmail.com / admin123)
-- directly into the Supabase Auth schema (`auth.users`) and the `public.lgu_admin` profile table.
-- It uses `pgcrypto` to hash the password properly for Supabase GoTrue authentication.

DO $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_email VARCHAR := 'admin@gmail.com';
    v_password VARCHAR := 'admin123';
    v_existing_id UUID;
BEGIN
    -- Check if the user already exists in auth.users
    SELECT id INTO v_existing_id FROM auth.users WHERE email = v_email;

    IF v_existing_id IS NULL THEN
        -- Insert into auth.users using pgcrypto for password hashing
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            is_super_admin
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            v_email,
            crypt(v_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"role":"lgu_admin","full_name":"City Administrator"}',
            now(),
            now(),
            'authenticated',
            false
        );
        
        -- Insert identity for the user
        INSERT INTO auth.identities (
            id,
            user_id,
            provider_id,
            identity_data,
            provider,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_user_id,
            v_user_id::text,
            json_build_object('sub', v_user_id::text, 'email', v_email),
            'email',
            now()
        );
    ELSE
        -- Update password and ensure email is confirmed if user already exists
        UPDATE auth.users
        SET encrypted_password = crypt(v_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = '{"role":"lgu_admin","full_name":"City Administrator"}'
        WHERE id = v_existing_id;
        
        v_user_id := v_existing_id;
    END IF;

    -- Insert or update into public.lgu_admin
    INSERT INTO public.lgu_admin (auth_user_id, email, full_name, role, account_status)
    VALUES (v_user_id, v_email, 'City Administrator', 'Super Admin', 'Active')
    ON CONFLICT (auth_user_id) DO UPDATE
    SET account_status = 'Active';

    RAISE NOTICE 'Seed completed for %', v_email;
END $$;

