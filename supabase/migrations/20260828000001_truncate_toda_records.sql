-- ============================================================================
-- SAKAY Database Migration: Clear All Records from public.toda & Related Data
-- Migration: 20260828000001_truncate_toda_records.sql
-- ============================================================================

-- 1. Truncate TODA table and all dependent tables (toda_admin, driver, booking, announcement, etc.)
TRUNCATE TABLE 
    public.toda_admin,
    public.announcement,
    public.incident_report,
    public.rating,
    public.gps_log,
    public.dispatch_attempt,
    public.booking,
    public.driver_verification,
    public.driver,
    public.toda
CASCADE;

-- 2. Remove any generated synthetic auth users for TODA admins
DELETE FROM auth.users 
WHERE email LIKE '%@toda.sakay.internal';

-- 3. Log audit event
INSERT INTO public.audit_log (
    action_type,
    details,
    performed_at
) VALUES (
    'TODA_TABLE_CLEARED',
    'All records in public.toda and linked associations have been purged by administrator request.',
    now()
);
