-- ============================================================================
-- SAKAY CAPSTONE PROJECT — SAFE TEST DRIVER CLEANUP SCRIPT
-- ============================================================================
-- Purpose:
--   Safely removes only test driver registrations and verification records
--   while STRICTLY PRESERVING:
--     1. TODA Organizations (CCTODA, BLTODA, SVTODA)
--     2. TODA Association Admins
--     3. City LGU Admins (admin@gmail.com)
--     4. Fare Matrix & Tariff Ordinances
--     5. Platform Audit Trails
-- ============================================================================

-- 1. PREVIEW TEST DRIVERS TO BE REMOVED (Run this SELECT first to inspect)
SELECT 
    d.driver_id,
    d.full_name,
    d.contact_number,
    d.account_status,
    d.created_at,
    v.verification_status,
    v.submitted_license_number
FROM public.driver d
LEFT JOIN public.driver_verification v ON d.driver_id = v.driver_id
ORDER BY d.created_at DESC;

-- 2. SAFE CLEANUP TRANSACTION (Uncomment to execute if desired)
/*
BEGIN;

-- Remove driver verifications for test drivers
DELETE FROM public.driver_verification 
WHERE driver_id IN (
    SELECT driver_id FROM public.driver
);

-- Remove test drivers
DELETE FROM public.driver;

-- Note: auth.users can also be pruned in Supabase Auth Dashboard for emails like driver_09XXXXXXXXX@sakay.ph

COMMIT;
*/
