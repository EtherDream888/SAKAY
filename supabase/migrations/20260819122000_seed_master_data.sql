-- ============================================================================
-- SAKAY Database Migration: Seed Master Data & LGU Admin Provisioning Template
-- Migration: 20260819122000_seed_master_data.sql
-- Target: Supabase PostgreSQL (Master Data & Baseline Seed Records)
-- City: Calapan City, Oriental Mindoro
-- ============================================================================

-- ============================================================================
-- 1. ACTIVE MUNICIPAL FARE MATRIX ORDINANCE
-- ============================================================================
-- Ordinance: Calapan City Ordinance No. 118, Series of 2022
-- Standard Tariff: ₱15.00 Base Fare (first 2.0 km), ₱1.00 per succeeding kilometer.

INSERT INTO public.fare_matrix (
    fare_matrix_id,
    base_fare,
    base_distance_km,
    succeeding_rate,
    effective_timestamp,
    is_active
) VALUES (
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01',
    15.00,
    2.00,
    1.00,
    '2022-06-01T00:00:00Z',
    TRUE
)
ON CONFLICT (fare_matrix_id) DO UPDATE SET
    base_fare = EXCLUDED.base_fare,
    base_distance_km = EXCLUDED.base_distance_km,
    succeeding_rate = EXCLUDED.succeeding_rate,
    effective_timestamp = EXCLUDED.effective_timestamp,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 2. ACCREDITED TODA ORGANIZATIONS (Calapan City Master Registry)
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
)
ON CONFLICT (registration_number) DO UPDATE SET
    toda_name = EXCLUDED.toda_name,
    toda_acronym = EXCLUDED.toda_acronym,
    terminal_latitude = EXCLUDED.terminal_latitude,
    terminal_longitude = EXCLUDED.terminal_longitude,
    service_coverage_area = EXCLUDED.service_coverage_area,
    account_status = EXCLUDED.account_status;

-- ============================================================================
-- 3. INITIAL MUNICIPAL ANNOUNCEMENTS / BULLETINS
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
)
ON CONFLICT (announcement_id) DO NOTHING;

-- ============================================================================
-- 4. LGU SUPER ADMINISTRATOR INITIAL PROVISIONING INSTRUCTIONS & TEMPLATE
-- ============================================================================
--
-- WHY CLIENT-SIDE REGISTRATION IS DISABLED FOR LGU ADMINS:
-- Allowing arbitrary unauthenticated or public clients to insert rows into `lgu_admin`
-- would create a critical privilege escalation vulnerability. Initial LGU Admin
-- provisioning must be done via a trusted server-side process or the Supabase Console.
--
-- HOW TO PROVISION THE FIRST LGU ADMIN ACCOUNT:
--
-- Step 1: In the Supabase Dashboard (https://supabase.com/dashboard/project/thxcltvgwwluvsfpciyr):
--         Navigate to: Authentication -> Users -> Click "Add User" -> "Create User"
--         Enter the official LGU Administrator email (e.g., lgu.admin@calapan.gov.ph) and a strong password.
--         Toggle "Auto Confirm User" ON.
--
-- Step 2: Copy the generated User UID (e.g., '11111111-2222-3333-4444-555555555555').
--
-- Step 3: Execute the following SQL query in the Supabase SQL Editor (replace UUID and email):
--
-- ----------------------------------------------------------------------------
-- INSERT INTO public.lgu_admin (
--     admin_id,
--     auth_user_id,
--     full_name,
--     email,
--     contact_number,
--     position,
--     account_status
-- ) VALUES (
--     gen_random_uuid(),
--     '<PASTE_AUTH_USER_UUID_FROM_STEP_2_HERE>',
--     'City Transport Administrator',
--     'lgu.admin@calapan.gov.ph',
--     '+63 917 000 0001',
--     'City Transport & Franchising Officer',
--     'Active'
-- );
-- ----------------------------------------------------------------------------
--
-- Step 4: Sign in to the LGU Portal (`apps/lgu-portal`) using those credentials.
--         `is_lgu_admin()` will return TRUE, granting full administrative access.
-- ============================================================================
