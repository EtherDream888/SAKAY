-- ============================================================================
-- SAKAY STANDALONE SQL RUNNER - PORTAL FIXES PHASE 1
-- File: supabase/sql_fixes/portal_fixes_phase1.sql
-- Run this directly in the Supabase SQL Editor if applying manually.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PUBLIC.ANNOUNCEMENT ENHANCEMENTS
-- ----------------------------------------------------------------------------

-- Allow city-wide announcements where toda_id is NULL
ALTER TABLE public.announcement ALTER COLUMN toda_id DROP NOT NULL;

-- Add audience and publication metadata columns
ALTER TABLE public.announcement ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) DEFAULT 'All';
ALTER TABLE public.announcement ADD COLUMN IF NOT EXISTS urgency VARCHAR(50) DEFAULT 'Normal';
ALTER TABLE public.announcement ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;

-- Update RLS policies on public.announcement
DROP POLICY IF EXISTS "announcement_insert_policy" ON public.announcement;
CREATE POLICY "announcement_insert_policy"
    ON public.announcement FOR INSERT TO authenticated
    WITH CHECK (
        public.is_lgu_admin() 
        OR (toda_id IS NOT NULL AND toda_id = public.get_current_toda_admin_toda_id())
    );

DROP POLICY IF EXISTS "announcement_update_policy" ON public.announcement;
CREATE POLICY "announcement_update_policy"
    ON public.announcement FOR UPDATE TO authenticated
    USING (
        public.is_lgu_admin() 
        OR (toda_id IS NOT NULL AND toda_id = public.get_current_toda_admin_toda_id())
    )
    WITH CHECK (
        public.is_lgu_admin() 
        OR (toda_id IS NOT NULL AND toda_id = public.get_current_toda_admin_toda_id())
    );

DROP POLICY IF EXISTS "announcement_delete_policy" ON public.announcement;
CREATE POLICY "announcement_delete_policy"
    ON public.announcement FOR DELETE TO authenticated
    USING (
        public.is_lgu_admin() 
        OR (toda_id IS NOT NULL AND toda_id = public.get_current_toda_admin_toda_id())
    );


-- ----------------------------------------------------------------------------
-- 2. PUBLIC.AUDIT_LOG ENHANCEMENTS
-- ----------------------------------------------------------------------------

-- Change target_id from UUID to TEXT to prevent crashes on plate numbers, etc.
ALTER TABLE public.audit_log ALTER COLUMN target_id TYPE TEXT;

-- Add auxiliary columns if not present
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Ensure created_at falls back to performed_at if null
UPDATE public.audit_log SET created_at = performed_at WHERE created_at IS NULL;


-- ----------------------------------------------------------------------------
-- 3. PUBLIC.INCIDENT_REPORT ENHANCEMENTS
-- ----------------------------------------------------------------------------

ALTER TABLE public.incident_report ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE public.incident_report ADD COLUMN IF NOT EXISTS reported_toda_id UUID REFERENCES public.toda(toda_id) ON DELETE SET NULL;

-- Automatically populate resolution_notes from resolution if missing
UPDATE public.incident_report SET resolution_notes = resolution WHERE resolution_notes IS NULL AND resolution IS NOT NULL;
UPDATE public.incident_report SET resolution = resolution_notes WHERE resolution IS NULL AND resolution_notes IS NOT NULL;

-- Backfill reported_toda_id from booking or driver relations
UPDATE public.incident_report ir
SET reported_toda_id = COALESCE(b.toda_id, d.toda_id)
FROM public.booking b
LEFT JOIN public.driver d ON b.driver_id = d.driver_id
WHERE ir.booking_id = b.booking_id AND ir.reported_toda_id IS NULL;

-- Trigger to sync resolution and resolution_notes on update or insert
CREATE OR REPLACE FUNCTION public.sync_incident_resolution_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.resolution IS NOT NULL AND NEW.resolution_notes IS NULL THEN
        NEW.resolution_notes := NEW.resolution;
    ELSIF NEW.resolution_notes IS NOT NULL AND NEW.resolution IS NULL THEN
        NEW.resolution := NEW.resolution_notes;
    END IF;

    -- Automatically set resolved_at when status is updated to Resolved
    IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' AND NEW.resolved_at IS NULL THEN
        NEW.resolved_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_incident_resolution ON public.incident_report;
CREATE TRIGGER trigger_sync_incident_resolution
BEFORE INSERT OR UPDATE ON public.incident_report
FOR EACH ROW EXECUTE FUNCTION public.sync_incident_resolution_fields();

-- Update RLS UPDATE Policy for incident reports to allow TODA admin review
DROP POLICY IF EXISTS "incident_report_update_policy" ON public.incident_report;
CREATE POLICY "incident_report_update_policy"
    ON public.incident_report FOR UPDATE TO authenticated
    USING (
        public.is_lgu_admin() 
        OR reviewed_by_toda = (
            SELECT admin_id FROM public.toda_admin WHERE auth_user_id = (SELECT auth.uid())
        )
        OR (
            -- Allow TODA admin to review if report is unassigned and belongs to their TODA
            reviewed_by_toda IS NULL
            AND (
                reported_toda_id = public.get_current_toda_admin_toda_id()
                OR booking_id IN (
                    SELECT booking_id FROM public.booking 
                    WHERE toda_id = public.get_current_toda_admin_toda_id()
                )
                OR driver_id IN (
                    SELECT driver_id FROM public.driver 
                    WHERE toda_id = public.get_current_toda_admin_toda_id()
                )
            )
        )
    )
    WITH CHECK (
        public.is_lgu_admin() 
        OR reviewed_by_toda = (
            SELECT admin_id FROM public.toda_admin WHERE auth_user_id = (SELECT auth.uid())
        )
        OR (
            -- Allow claim/review by TODA admin
            (
                reported_toda_id = public.get_current_toda_admin_toda_id()
                OR booking_id IN (
                    SELECT booking_id FROM public.booking 
                    WHERE toda_id = public.get_current_toda_admin_toda_id()
                )
                OR driver_id IN (
                    SELECT driver_id FROM public.driver 
                    WHERE toda_id = public.get_current_toda_admin_toda_id()
                )
            )
        )
    );


-- ----------------------------------------------------------------------------
-- 4. PUBLIC.FARE_MATRIX ENHANCEMENTS
-- ----------------------------------------------------------------------------

ALTER TABLE public.fare_matrix ADD COLUMN IF NOT EXISTS ordinance_reference VARCHAR(255);
ALTER TABLE public.fare_matrix ADD COLUMN IF NOT EXISTS notes TEXT;


-- ----------------------------------------------------------------------------
-- 5. DRIVER & PASSENGER STRIKES & SUSPENSION ENHANCEMENTS
-- ----------------------------------------------------------------------------

ALTER TABLE public.driver ADD COLUMN IF NOT EXISTS strikes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.driver ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE public.driver ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE public.passenger ADD COLUMN IF NOT EXISTS strikes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.passenger ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE public.passenger ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;


-- ----------------------------------------------------------------------------
-- 6. PUBLIC.DRIVER_RATING VIEW (FOR FEEDBACK PAGE COMPATIBILITY)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.driver_rating AS
SELECT 
    r.rating_id,
    r.booking_id,
    r.rater_id AS passenger_id,
    r.ratee_id AS driver_id,
    r.stars,
    r.tags,
    r.comment,
    r.created_at,
    p.full_name AS passenger_name,
    p.contact_number AS passenger_contact,
    d.full_name AS driver_name,
    d.contact_number AS driver_contact,
    d.plate_number,
    d.toda_id,
    t.toda_name,
    t.toda_acronym
FROM public.rating r
LEFT JOIN public.passenger p ON p.passenger_id = r.rater_id
LEFT JOIN public.driver d ON d.driver_id = r.ratee_id
LEFT JOIN public.toda t ON t.toda_id = d.toda_id;

-- Grant permissions on driver_rating view
GRANT SELECT ON public.driver_rating TO anon, authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
