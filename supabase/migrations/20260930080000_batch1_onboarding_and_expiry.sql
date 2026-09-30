-- ============================================================================
-- SAKAY POLICY IMPLEMENTATION - BATCH 1 OF 13
-- Migration File: 20260930080000_batch1_onboarding_and_expiry.sql
-- Description:
--   1. Shared Canonical Admin Review Flag table (public.admin_review_flag)
--      and notification deduplication support.
--   2. Database-backed Booking Service Area configuration (public.service_area_config)
--      and booking-creation boundary gate trigger (PI-01 Option C).
--   3. Server-side Master Roster repository (public.toda_roster_entry) with normalized
--      franchise/plate matching trigger (Rule 2.4).
--   4. TODA Terminal Relocation workflow & TODA column guards (Rules 2.1, 2.2).
--   5. Multi-affiliation schema (public.driver_toda_affiliation) with sequential
--      review tracking (TODA endorsement -> LGU verification), column guards,
--      offline active affiliation selection RPC, and backfill (Rules 3.1, 3.10).
--   6. Hardening driver credentials:
--      - Migrate driver.account_status 'Active' -> 'Verified'.
--      - Permanent disqualification flag (Rule 3.9).
--      - DB-level normalized uniqueness checks that flag duplicates (Rule 3.2).
--      - Lock down expiry columns and read-only attributes (Rule 24.2).
--   7. Asia/Manila calendar-day review SLA calculation & documentary restriction
--      cascade functions (Section 24).
--   8. SECURITY DEFINER administrative and lifecycle RPCs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SHARED CANONICAL ADMIN REVIEW FLAG TABLE & NOTIFICATION DEDUPLICATION
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_review_flag (
    flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_type VARCHAR(100) NOT NULL 
        CHECK (flag_type IN ('ROSTER_MISMATCH', 'TODA_EXCESS_INCIDENTS', 'APPLICATION_OVERDUE', 'DUPLICATE_LICENSE', 'DUPLICATE_PLATE', 'DUPLICATE_MTOP', 'PERMANENT_DISQUALIFICATION')),
    subject_type VARCHAR(50) NOT NULL 
        CHECK (subject_type IN ('toda', 'driver_application', 'driver')),
    subject_id TEXT NOT NULL,                  -- toda_id, affiliation_id, or driver_id
    source_rule VARCHAR(50) NOT NULL,          -- 'Rule 2.4', 'Rule 2.5', 'Rule 3.2', 'Rule 3.7', 'Rule 3.9'
    status VARCHAR(50) NOT NULL DEFAULT 'Open' 
        CHECK (status IN ('Open', 'Under Review', 'Resolved', 'Dismissed')),
    details JSONB,                             -- Context details (counts, candidate info, timestamps)
    resolution TEXT,                           -- Officer resolution notes
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    assigned_role VARCHAR(50) NOT NULL 
        CHECK (assigned_role IN ('lgu_admin', 'toda_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency constraint: At most one 'Open' or 'Under Review' flag per subject and flag type
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_review_flag_unique_open
    ON public.admin_review_flag(subject_type, subject_id, flag_type)
    WHERE status IN ('Open', 'Under Review');

CREATE INDEX IF NOT EXISTS idx_admin_review_flag_role_status
    ON public.admin_review_flag(assigned_role, status);

ALTER TABLE public.admin_review_flag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_review_flag_select" ON public.admin_review_flag;
CREATE POLICY "admin_review_flag_select" ON public.admin_review_flag
    FOR SELECT TO authenticated
    USING (
        public.is_lgu_admin()
        OR (assigned_role = 'toda_admin' AND subject_id = public.get_current_toda_admin_toda_id()::TEXT)
    );

DROP POLICY IF EXISTS "admin_review_flag_update" ON public.admin_review_flag;
CREATE POLICY "admin_review_flag_update" ON public.admin_review_flag
    FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

DROP POLICY IF EXISTS "admin_review_flag_insert" ON public.admin_review_flag;
CREATE POLICY "admin_review_flag_insert" ON public.admin_review_flag
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_lgu_admin()
        OR public.is_toda_admin()
        OR current_setting('sakay.internal_context', true) = 'true'
    );

-- Add notification deduplication columns to public.notification
ALTER TABLE public.notification
    ADD COLUMN IF NOT EXISTS recipient_id TEXT,
    ADD COLUMN IF NOT EXISTS subject_id TEXT,
    ADD COLUMN IF NOT EXISTS threshold_days INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_dedupe
    ON public.notification (recipient_id, notification_type, subject_id, threshold_days);

-- ----------------------------------------------------------------------------
-- 1.1 CENTRAL POLICY CONFIGURATION TABLE (Rule 3.7, 24.4, Requirement A8)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_policy_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.system_policy_config (config_key, config_value, description)
VALUES 
    ('driver_review_deadline_days', '5'::jsonb, 'Calendar days review SLA per verification stage (Rule 3.7)'),
    ('driver_stage_reminder_days', '3'::jsonb, 'Advance days before SLA deadline to send reminder notice (Rule 3.7)'),
    ('document_expiry_reminder_thresholds', '[30, 14, 3]'::jsonb, 'Days before license/MTOP/TODA accreditation expiration to send notifications (Rule 24.4)'),
    ('toda_incident_report_flag_threshold', '3'::jsonb, 'Threshold of upheld incident reports that triggers administrative flag (Rule 2.5)'),
    ('toda_incident_report_window_days', '60'::jsonb, 'Rolling window in calendar days for excess incident monitoring (Rule 2.5)')
ON CONFLICT (config_key) DO UPDATE
SET config_value = EXCLUDED.config_value,
    description = EXCLUDED.description;

ALTER TABLE public.system_policy_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_policy_config_select" ON public.system_policy_config;
CREATE POLICY "system_policy_config_select" ON public.system_policy_config
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "system_policy_config_modify" ON public.system_policy_config;
CREATE POLICY "system_policy_config_modify" ON public.system_policy_config
    FOR ALL TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE OR REPLACE FUNCTION public.get_policy_config_int(p_key TEXT, p_default INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_val JSONB;
BEGIN
    SELECT config_value INTO v_val FROM public.system_policy_config WHERE config_key = p_key;
    IF v_val IS NULL THEN
        RETURN p_default;
    END IF;
    RETURN (v_val#>>'{}')::INTEGER;
EXCEPTION WHEN OTHERS THEN
    RETURN p_default;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_policy_config_int_array(p_key TEXT, p_default INTEGER[])
RETURNS INTEGER[] AS $$
DECLARE
    v_val JSONB;
    v_arr INTEGER[];
BEGIN
    SELECT config_value INTO v_val FROM public.system_policy_config WHERE config_key = p_key;
    IF v_val IS NULL OR jsonb_typeof(v_val) != 'array' THEN
        RETURN p_default;
    END IF;
    SELECT ARRAY(SELECT jsonb_array_elements_text(v_val)::INTEGER) INTO v_arr;
    RETURN COALESCE(v_arr, p_default);
EXCEPTION WHEN OTHERS THEN
    RETURN p_default;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, pg_temp;


-- ----------------------------------------------------------------------------
-- 2. SERVICE AREA CONFIGURATION & BOOKING-CREATION GATE (PI-01 Option C)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.service_area_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_name VARCHAR(100) NOT NULL,
    center_latitude DOUBLE PRECISION NOT NULL,
    center_longitude DOUBLE PRECISION NOT NULL,
    radius_km DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- At most one active service area configuration allowed at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_area_config_single_active
    ON public.service_area_config(is_active)
    WHERE is_active = TRUE;

ALTER TABLE public.service_area_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_area_config_select" ON public.service_area_config;
CREATE POLICY "service_area_config_select" ON public.service_area_config
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "service_area_config_manage" ON public.service_area_config;
CREATE POLICY "service_area_config_manage" ON public.service_area_config
    FOR ALL TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

-- Insert default test boundary: Calapan City testing area (Center 13.4117, 121.1803, Radius 16.0 km)
INSERT INTO public.service_area_config (
    area_name,
    center_latitude,
    center_longitude,
    radius_km,
    is_active,
    notes
)
SELECT 
    'Calapan City Testing Scope (Temporary PI-01 Variant)',
    13.4117,
    121.1803,
    16.0,
    TRUE,
    'Temporary testing variant covering Calapan City. Must be narrowed to pilot area (Brgy. Lumangbayan / Xentro Mall) before pilot and defense.'
WHERE NOT EXISTS (SELECT 1 FROM public.service_area_config);

-- Server-side Haversine helper
CREATE OR REPLACE FUNCTION public.calculate_haversine_distance_km(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    r CONSTANT DOUBLE PRECISION := 6371.0; -- Earth radius in km
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN 0.0;
    END IF;
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat / 2.0) * sin(dlat / 2.0) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon / 2.0) * sin(dlon / 2.0);
    c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
    RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: Enforce booking creation pickup within authorized service area
CREATE OR REPLACE FUNCTION public.check_booking_service_area_gate()
RETURNS TRIGGER AS $$
DECLARE
    v_config public.service_area_config;
    v_dist DOUBLE PRECISION;
BEGIN
    IF NEW.pickup_latitude IS NULL OR NEW.pickup_longitude IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_config
    FROM public.service_area_config
    WHERE is_active = TRUE
    LIMIT 1;

    IF v_config.config_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_dist := public.calculate_haversine_distance_km(
        v_config.center_latitude,
        v_config.center_longitude,
        NEW.pickup_latitude,
        NEW.pickup_longitude
    );

    IF v_dist > v_config.radius_km THEN
        RAISE EXCEPTION 'ERR_OUT_OF_SERVICE_AREA: Ang lokasyon ng pickup ay nasa labas ng opisyal na nasasakupan ng SAKAY sa Lungsod ng Calapan (% km mula sa sentro, limitasyon: % km).',
            round(v_dist::numeric, 2), round(v_config.radius_km::numeric, 2);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_booking_service_area_gate ON public.booking;
CREATE TRIGGER trigger_booking_service_area_gate
    BEFORE INSERT ON public.booking
    FOR EACH ROW
    EXECUTE FUNCTION public.check_booking_service_area_gate();

-- RPC: Set Pilot Service Area narrowed to a specific TODA's terminal
CREATE OR REPLACE FUNCTION public.set_pilot_service_area(
    p_toda_id UUID,
    p_radius_km DOUBLE PRECISION DEFAULT 1.5
)
RETURNS JSONB AS $$
DECLARE
    v_toda public.toda;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only LGU Administrators can update the service area.');
    END IF;

    SELECT * INTO v_toda FROM public.toda WHERE toda_id = p_toda_id;
    IF v_toda.toda_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'TODA not found.');
    END IF;

    IF v_toda.terminal_latitude IS NULL OR v_toda.terminal_longitude IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selected TODA has no terminal coordinates configured.');
    END IF;

    UPDATE public.service_area_config
    SET is_active = FALSE
    WHERE is_active = TRUE;

    INSERT INTO public.service_area_config (
        area_name,
        center_latitude,
        center_longitude,
        radius_km,
        is_active,
        notes
    ) VALUES (
        'Pilot Area: ' || v_toda.toda_name,
        v_toda.terminal_latitude,
        v_toda.terminal_longitude,
        p_radius_km,
        TRUE,
        'Configured pilot area around ' || v_toda.toda_name || ' terminal.'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Pilot service area configured successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ----------------------------------------------------------------------------
-- 3. SERVER-SIDE MASTER ROSTER REPOSITORY (Rule 2.4)
-- ----------------------------------------------------------------------------
-- Note: Contains personal identification data governed by Batch 12 retention.

CREATE TABLE IF NOT EXISTS public.toda_roster_entry (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toda_id UUID NOT NULL REFERENCES public.toda(toda_id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    franchise_number TEXT,
    plate_number TEXT,
    license_number TEXT,
    normalized_name TEXT,
    normalized_franchise TEXT,
    normalized_plate TEXT,
    normalized_license TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_toda_roster_franchise_plate
    ON public.toda_roster_entry(toda_id, normalized_franchise, normalized_plate);

-- Trigger: Normalize master roster entries automatically & disallow backdating created_at
CREATE OR REPLACE FUNCTION public.sync_toda_roster_entry_normalized()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_name := regexp_replace(lower(COALESCE(NEW.member_name, '')), '[^a-z0-9]', '', 'g');
    NEW.normalized_franchise := regexp_replace(upper(COALESCE(NEW.franchise_number, '')), '[^A-Z0-9]', '', 'g');
    NEW.normalized_plate := regexp_replace(upper(COALESCE(NEW.plate_number, '')), '[^A-Z0-9]', '', 'g');
    NEW.normalized_license := regexp_replace(upper(COALESCE(NEW.license_number, '')), '[^A-Z0-9]', '', 'g');

    IF TG_OP = 'UPDATE' AND NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Access Denied: created_at timestamp on roster entries is immutable and cannot be back-dated.';
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.created_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_toda_roster_entry_normalized ON public.toda_roster_entry;
CREATE TRIGGER trigger_sync_toda_roster_entry_normalized
    BEFORE INSERT OR UPDATE ON public.toda_roster_entry
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_toda_roster_entry_normalized();

ALTER TABLE public.toda_roster_entry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "toda_roster_entry_select" ON public.toda_roster_entry;
CREATE POLICY "toda_roster_entry_select" ON public.toda_roster_entry
    FOR SELECT TO authenticated
    USING (
        public.is_lgu_admin()
        OR toda_id = public.get_current_toda_admin_toda_id()
    );

DROP POLICY IF EXISTS "toda_roster_entry_insert" ON public.toda_roster_entry;
CREATE POLICY "toda_roster_entry_insert" ON public.toda_roster_entry
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_lgu_admin()
        OR toda_id = public.get_current_toda_admin_toda_id()
    );

DROP POLICY IF EXISTS "toda_roster_entry_update" ON public.toda_roster_entry;
CREATE POLICY "toda_roster_entry_update" ON public.toda_roster_entry
    FOR UPDATE TO authenticated
    USING (
        public.is_lgu_admin()
        OR toda_id = public.get_current_toda_admin_toda_id()
    )
    WITH CHECK (
        public.is_lgu_admin()
        OR toda_id = public.get_current_toda_admin_toda_id()
    );

DROP POLICY IF EXISTS "toda_roster_entry_delete" ON public.toda_roster_entry;
CREATE POLICY "toda_roster_entry_delete" ON public.toda_roster_entry
    FOR DELETE TO authenticated
    USING (
        public.is_lgu_admin()
        OR toda_id = public.get_current_toda_admin_toda_id()
    );


-- ----------------------------------------------------------------------------
-- 4. TODA TERMINAL RELOCATION & TODA COLUMN GUARDS (Rules 2.1, 2.2)
-- ----------------------------------------------------------------------------

ALTER TABLE public.toda
    ADD COLUMN IF NOT EXISTS pending_terminal_latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS pending_terminal_longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS pending_terminal_location TEXT,
    ADD COLUMN IF NOT EXISTS terminal_relocation_status VARCHAR(50) NOT NULL DEFAULT 'Approved'
        CHECK (terminal_relocation_status IN ('Approved', 'Pending LGU Re-approval', 'Rejected')),
    ADD COLUMN IF NOT EXISTS terminal_relocation_requested_at TIMESTAMPTZ;

-- Guard direct modifications to toda read-only columns
CREATE OR REPLACE FUNCTION public.protect_toda_read_only_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_lgu_admin() 
       OR current_setting('sakay.internal_context', true) = 'true' 
       OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF NEW.terminal_latitude IS DISTINCT FROM OLD.terminal_latitude
       OR NEW.terminal_longitude IS DISTINCT FROM OLD.terminal_longitude
       OR NEW.certificate_expiry IS DISTINCT FROM OLD.certificate_expiry
       OR NEW.toda_status IS DISTINCT FROM OLD.toda_status THEN
        RAISE EXCEPTION 'Access Denied: Terminal coordinates, certificate expiry, and TODA status can only be modified by LGU Administrators or through authorized RPCs.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_toda_read_only_columns ON public.toda;
CREATE TRIGGER trigger_protect_toda_read_only_columns
    BEFORE UPDATE ON public.toda
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_toda_read_only_columns();


-- ----------------------------------------------------------------------------
-- 5. MULTI-AFFILIATION SCHEMA & SEQUENTIAL VERIFICATION (Rules 3.1, 3.10)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.driver_toda_affiliation (
    affiliation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.driver(driver_id) ON DELETE CASCADE,
    toda_id UUID NOT NULL REFERENCES public.toda(toda_id) ON DELETE CASCADE,
    toda_membership_number VARCHAR(100),
    toda_endorsement_status VARCHAR(50) NOT NULL DEFAULT 'Submitted'
        CHECK (toda_endorsement_status IN ('Submitted', 'Endorsed', 'Resubmission Required', 'Rejected')),
    toda_endorsed_at TIMESTAMPTZ,
    toda_endorsed_by UUID REFERENCES public.toda_admin(admin_id) ON DELETE SET NULL,
    toda_rejection_reason TEXT,
    toda_return_notes TEXT,
    lgu_verification_status VARCHAR(50) NOT NULL DEFAULT 'Pending'
        CHECK (lgu_verification_status IN ('Pending', 'Approved', 'Resubmission Required', 'Rejected')),
    lgu_verified_at TIMESTAMPTZ,
    lgu_verified_by UUID REFERENCES public.lgu_admin(admin_id) ON DELETE SET NULL,
    lgu_rejection_reason TEXT,
    lgu_return_notes TEXT,
    is_active_selection BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resubmitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(driver_id, toda_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_affiliation_driver
    ON public.driver_toda_affiliation(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_affiliation_toda
    ON public.driver_toda_affiliation(toda_id);

ALTER TABLE public.driver_toda_affiliation ENABLE ROW LEVEL SECURITY;

-- Select policy: Driver, that TODA's admin, and LGU admin ONLY (no anon)
DROP POLICY IF EXISTS "driver_affiliation_select" ON public.driver_toda_affiliation;
CREATE POLICY "driver_affiliation_select" ON public.driver_toda_affiliation
    FOR SELECT TO authenticated
    USING (
        public.is_lgu_admin()
        OR toda_id = public.get_current_toda_admin_toda_id()
        OR driver_id IN (SELECT driver_id FROM public.driver WHERE auth_user_id = (SELECT auth.uid()))
    );

-- Insert policy: New applications can only be inserted in Submitted/Pending status
DROP POLICY IF EXISTS "driver_affiliation_insert" ON public.driver_toda_affiliation;
CREATE POLICY "driver_affiliation_insert" ON public.driver_toda_affiliation
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_lgu_admin()
        OR (
            driver_id IN (SELECT driver_id FROM public.driver WHERE auth_user_id = (SELECT auth.uid()))
            AND toda_endorsement_status = 'Submitted'
            AND lgu_verification_status = 'Pending'
            AND is_active_selection = FALSE
        )
    );

-- Trigger: Validate driver application insertion (active TODA, not permanently disqualified)
CREATE OR REPLACE FUNCTION public.check_driver_affiliation_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_driver public.driver;
    v_toda public.toda;
BEGIN
    IF current_setting('sakay.internal_context', true) = 'true' 
       OR current_setting('request.jwt.claim.role', true) = 'service_role'
       OR public.is_lgu_admin() THEN
        RETURN NEW;
    END IF;

    -- Verify driver is not permanently disqualified
    SELECT * INTO v_driver FROM public.driver WHERE driver_id = NEW.driver_id;
    IF v_driver.driver_id IS NULL THEN
        RAISE EXCEPTION 'Driver record not found.';
    END IF;
    IF v_driver.is_permanently_disqualified = TRUE THEN
        RAISE EXCEPTION 'ERR_DRIVER_PERMANENTLY_DISQUALIFIED: Ang drayber na ito ay permanenteng diskwalipikado sa sistema ng SAKAY.';
    END IF;

    -- Verify target TODA is Active and not expired
    SELECT * INTO v_toda FROM public.toda WHERE toda_id = NEW.toda_id;
    IF v_toda.toda_id IS NULL THEN
        RAISE EXCEPTION 'TODA record not found.';
    END IF;
    IF v_toda.toda_status != 'Active' OR (v_toda.certificate_expiry IS NOT NULL AND (v_toda.certificate_expiry AT TIME ZONE 'Asia/Manila')::DATE < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE) THEN
        RAISE EXCEPTION 'ERR_TODA_NOT_ACTIVE: Hindi maaaring mag-aplay sa TODA na hindi aktibo o paso na ang akreditasyon.';
    END IF;

    -- Enforce initial submission status: must be Submitted, Pending, and not active selection
    IF NEW.toda_endorsement_status != 'Submitted' OR NEW.lgu_verification_status != 'Pending' OR NEW.is_active_selection != FALSE THEN
        RAISE EXCEPTION 'Access Denied: New affiliation applications may only be submitted with Submitted and Pending status.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_driver_affiliation_insert ON public.driver_toda_affiliation;
CREATE TRIGGER trigger_check_driver_affiliation_insert
    BEFORE INSERT ON public.driver_toda_affiliation
    FOR EACH ROW
    EXECUTE FUNCTION public.check_driver_affiliation_insert();

-- Update policy: Restricted to administrative contexts
DROP POLICY IF EXISTS "driver_affiliation_update" ON public.driver_toda_affiliation;
CREATE POLICY "driver_affiliation_update" ON public.driver_toda_affiliation
    FOR UPDATE TO authenticated
    USING (
        public.is_lgu_admin()
        OR toda_id = public.get_current_toda_admin_toda_id()
        OR driver_id IN (SELECT driver_id FROM public.driver WHERE auth_user_id = (SELECT auth.uid()))
    )
    WITH CHECK (
        public.is_lgu_admin()
        OR toda_id = public.get_current_toda_admin_toda_id()
        OR driver_id IN (SELECT driver_id FROM public.driver WHERE auth_user_id = (SELECT auth.uid()))
    );

-- Trigger: Guard direct client updates to endorsement, verification, or active selection columns
CREATE OR REPLACE FUNCTION public.protect_driver_affiliation_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_claims JSONB;
BEGIN
    BEGIN
        v_role := auth.role();
    EXCEPTION WHEN OTHERS THEN
        v_role := NULL;
    END;
    IF v_role IS NULL THEN
        BEGIN
            v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::JSONB;
            v_role := v_claims->>'role';
        EXCEPTION WHEN OTHERS THEN
            v_role := current_setting('request.jwt.claim.role', true);
        END;
    END IF;

    IF v_role = 'service_role'
       OR current_setting('sakay.internal_context', true) = 'true' 
       OR public.is_lgu_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.toda_endorsement_status IS DISTINCT FROM OLD.toda_endorsement_status
       OR NEW.lgu_verification_status IS DISTINCT FROM OLD.lgu_verification_status
       OR NEW.is_active_selection IS DISTINCT FROM OLD.is_active_selection THEN
        RAISE EXCEPTION 'Access Denied: Affiliation endorsement, verification, and active selection can only be modified through official administrative procedures or select_active_driver_affiliation RPC.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_protect_driver_affiliation_columns ON public.driver_toda_affiliation;
CREATE TRIGGER trigger_protect_driver_affiliation_columns
    BEFORE UPDATE ON public.driver_toda_affiliation
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_driver_affiliation_columns();

-- Trigger: Block changing active affiliation while availability_status is not 'Offline' (Rule 3.10)
CREATE OR REPLACE FUNCTION public.check_driver_offline_before_affiliation_change()
RETURNS TRIGGER AS $$
DECLARE
    v_avail VARCHAR(50);
BEGIN
    IF NEW.is_active_selection = TRUE AND (OLD.is_active_selection IS DISTINCT FROM TRUE) THEN
        SELECT availability_status INTO v_avail
        FROM public.driver
        WHERE driver_id = NEW.driver_id;

        IF v_avail IS NOT NULL AND v_avail != 'Offline' THEN
            RAISE EXCEPTION 'ERR_MUST_BE_OFFLINE: Bago magpalit ng aktibong TODA, kailangan munang mag-Offline (Driver must be Offline before changing active TODA affiliation).';
        END IF;

        IF NEW.toda_endorsement_status != 'Endorsed' OR NEW.lgu_verification_status != 'Approved' THEN
            RAISE EXCEPTION 'ERR_AFFILIATION_NOT_VERIFIED: Hindi maaaring piliin ang TODA na hindi pa ganap na aprubado ng TODA at LGU.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_driver_offline_before_affiliation_change ON public.driver_toda_affiliation;
CREATE TRIGGER trigger_driver_offline_before_affiliation_change
    BEFORE UPDATE OF is_active_selection ON public.driver_toda_affiliation
    FOR EACH ROW
    EXECUTE FUNCTION public.check_driver_offline_before_affiliation_change();

-- Backfill driver_toda_affiliation from existing driver records
INSERT INTO public.driver_toda_affiliation (
    driver_id,
    toda_id,
    toda_membership_number,
    toda_endorsement_status,
    toda_endorsed_at,
    lgu_verification_status,
    lgu_verified_at,
    is_active_selection,
    submitted_at
)
SELECT 
    d.driver_id,
    d.toda_id,
    d.toda_membership_number,
    CASE 
        WHEN d.account_status IN ('Active', 'Verified', 'Suspended', 'Deactivated') AND (d.lgu_approved_at IS NOT NULL OR d.endorsed_at IS NOT NULL) THEN 'Endorsed'::varchar
        WHEN d.account_status = 'Rejected' AND d.lgu_approved_at IS NULL AND d.endorsed_at IS NULL THEN 'Rejected'::varchar
        WHEN d.account_status = 'Resubmission Required' AND d.lgu_approved_at IS NULL AND d.endorsed_at IS NULL THEN 'Resubmission Required'::varchar
        WHEN d.endorsed_at IS NOT NULL THEN 'Endorsed'::varchar
        ELSE 'Submitted'::varchar
    END,
    COALESCE(d.endorsed_at, CASE WHEN d.account_status IN ('Active', 'Verified') THEN d.created_at ELSE NULL END),
    CASE 
        WHEN d.account_status IN ('Active', 'Verified', 'Suspended', 'Deactivated') AND (d.lgu_approved_at IS NOT NULL OR d.endorsed_at IS NOT NULL) THEN 'Approved'::varchar
        WHEN d.account_status = 'Rejected' AND (d.lgu_approved_at IS NOT NULL OR d.endorsed_at IS NOT NULL) THEN 'Rejected'::varchar
        WHEN d.account_status = 'Resubmission Required' AND (d.lgu_approved_at IS NOT NULL OR d.endorsed_at IS NOT NULL) THEN 'Resubmission Required'::varchar
        ELSE 'Pending'::varchar
    END,
    COALESCE(d.lgu_approved_at, CASE WHEN d.account_status IN ('Active', 'Verified') THEN d.created_at ELSE NULL END),
    TRUE,
    d.created_at
FROM public.driver d
WHERE d.toda_id IS NOT NULL
ON CONFLICT (driver_id, toda_id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 6. HARDEN DRIVER CREDENTIALS, STATUS & EXPIRY PROTECTION (Rules 3.2, 3.8, 3.9, 24.2)
-- ----------------------------------------------------------------------------

-- Add permanent disqualification flags
ALTER TABLE public.driver
    ADD COLUMN IF NOT EXISTS is_permanently_disqualified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS disqualification_reason TEXT,
    ADD COLUMN IF NOT EXISTS disqualified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disqualified_by UUID REFERENCES public.lgu_admin(admin_id) ON DELETE SET NULL;

-- Migrate driver.account_status 'Active' -> 'Verified'
UPDATE public.driver 
SET account_status = 'Verified' 
WHERE account_status = 'Active';

-- Dynamically drop any existing check constraints on driver.account_status and re-add canonical set
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.driver'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) LIKE '%account_status%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.driver DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.driver 
    ADD CONSTRAINT driver_account_status_check 
    CHECK (account_status IN ('Pending Verification', 'Verified', 'Rejected', 'Suspended', 'Deactivated', 'Resubmission Required'));

-- Add duplicate and renewal tracking columns to driver_verification
ALTER TABLE public.driver_verification
    ADD COLUMN IF NOT EXISTS is_duplicate_license BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_duplicate_mtop BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pending_license_expiry DATE,
    ADD COLUMN IF NOT EXISTS pending_mtop_expiry DATE,
    ADD COLUMN IF NOT EXISTS pending_license_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS pending_mtop_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS renewal_status VARCHAR(50) DEFAULT NULL
        CHECK (renewal_status IS NULL OR renewal_status IN ('Pending LGU Verification', 'Approved', 'Rejected'));

-- Normalization and duplicate check trigger on driver_verification (Rule 3.2)
CREATE OR REPLACE FUNCTION public.check_driver_credential_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
    v_norm_lic TEXT;
    v_norm_plate TEXT;
    v_dup_driver UUID;
BEGIN
    v_norm_lic := regexp_replace(upper(COALESCE(NEW.submitted_license_number, '')), '[^A-Z0-9]', '', 'g');
    v_norm_plate := regexp_replace(upper(COALESCE(NEW.submitted_plate_number, '')), '[^A-Z0-9]', '', 'g');

    -- Check license uniqueness across other drivers
    IF v_norm_lic != '' THEN
        SELECT driver_id INTO v_dup_driver
        FROM public.driver
        WHERE driver_id != NEW.driver_id
          AND regexp_replace(upper(COALESCE(license_number, '')), '[^A-Z0-9]', '', 'g') = v_norm_lic
        LIMIT 1;

        IF v_dup_driver IS NOT NULL THEN
            NEW.scan_status := 'Flagged';
            NEW.is_duplicate_license := TRUE;

            INSERT INTO public.admin_review_flag (
                flag_type, subject_type, subject_id, source_rule, assigned_role, details
            ) VALUES (
                'DUPLICATE_LICENSE',
                'driver_application',
                NEW.driver_id::TEXT,
                'Rule 3.2',
                'lgu_admin',
                jsonb_build_object(
                    'type', 'license',
                    'number', NEW.submitted_license_number,
                    'conflicting_driver_id', v_dup_driver
                )
            ) ON CONFLICT (subject_type, subject_id, flag_type) WHERE status IN ('Open', 'Under Review') DO NOTHING;
        END IF;
    END IF;

    -- Check plate / franchise uniqueness across other drivers
    IF v_norm_plate != '' THEN
        SELECT driver_id INTO v_dup_driver
        FROM public.driver
        WHERE driver_id != NEW.driver_id
          AND regexp_replace(upper(COALESCE(plate_number, '')), '[^A-Z0-9]', '', 'g') = v_norm_plate
        LIMIT 1;

        IF v_dup_driver IS NOT NULL THEN
            NEW.scan_status := 'Flagged';
            NEW.is_duplicate_mtop := TRUE;

            INSERT INTO public.admin_review_flag (
                flag_type, subject_type, subject_id, source_rule, assigned_role, details
            ) VALUES (
                'DUPLICATE_PLATE',
                'driver_application',
                NEW.driver_id::TEXT,
                'Rule 3.2',
                'lgu_admin',
                jsonb_build_object(
                    'type', 'plate',
                    'number', NEW.submitted_plate_number,
                    'conflicting_driver_id', v_dup_driver
                )
            ) ON CONFLICT (subject_type, subject_id, flag_type) WHERE status IN ('Open', 'Under Review') DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_driver_credential_uniqueness ON public.driver_verification;
CREATE TRIGGER trigger_driver_credential_uniqueness
    BEFORE INSERT OR UPDATE ON public.driver_verification
    FOR EACH ROW
    EXECUTE FUNCTION public.check_driver_credential_uniqueness();

-- Lock down read-only columns in protect_read_only_columns trigger (Rules 24.2, B7)
CREATE OR REPLACE FUNCTION public.protect_read_only_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_claims JSONB;
BEGIN
    BEGIN
        v_role := auth.role();
    EXCEPTION WHEN OTHERS THEN
        v_role := NULL;
    END;
    IF v_role IS NULL THEN
        BEGIN
            v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::JSONB;
            v_role := v_claims->>'role';
        EXCEPTION WHEN OTHERS THEN
            v_role := current_setting('request.jwt.claim.role', true);
        END;
    END IF;

    IF v_role = 'service_role'
       OR current_setting('sakay.internal_context', true) = 'true' 
       OR public.is_lgu_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'passenger' THEN
        IF OLD.account_status = 'Pending OTP Verification' AND NEW.account_status = 'Active' THEN
            RETURN NEW;
        END IF;
        IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
            RAISE EXCEPTION 'Access Denied: Passengers cannot modify their own account_status.';
        END IF;
    END IF;

    IF TG_TABLE_NAME = 'driver' THEN
        IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
            RAISE EXCEPTION 'Access Denied: Only LGU Administrators can modify driver account_status.';
        END IF;

        IF NEW.license_expiry IS DISTINCT FROM OLD.license_expiry OR NEW.mtop_expiry IS DISTINCT FROM OLD.mtop_expiry THEN
            RAISE EXCEPTION 'Access Denied: Expiry dates can only be updated by LGU Administrators upon verified renewal.';
        END IF;

        IF NEW.toda_id IS DISTINCT FROM OLD.toda_id THEN
            RAISE EXCEPTION 'Access Denied: Active TODA affiliation must be selected through select_active_driver_affiliation RPC.';
        END IF;

        IF NEW.weighted_average_rating IS DISTINCT FROM OLD.weighted_average_rating THEN
            RAISE EXCEPTION 'Access Denied: Cannot modify weighted_average_rating.';
        END IF;

        IF NEW.is_permanently_disqualified IS DISTINCT FROM OLD.is_permanently_disqualified THEN
            RAISE EXCEPTION 'Access Denied: Only LGU Administrators can permanently disqualify drivers.';
        END IF;
    END IF;

    IF TG_TABLE_NAME = 'driver_verification' THEN
        IF EXISTS (
            SELECT 1 FROM public.driver d 
            WHERE d.driver_id = OLD.driver_id 
            AND d.auth_user_id = (SELECT auth.uid())
        ) THEN
            IF NEW.verification_status IS DISTINCT FROM OLD.verification_status OR
               NEW.stage2_reviewed_by IS DISTINCT FROM OLD.stage2_reviewed_by OR
               NEW.stage2_reviewed_at IS DISTINCT FROM OLD.stage2_reviewed_at THEN
                RAISE EXCEPTION 'Access Denied: Drivers cannot modify verification status.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Scoped rating recalculation trigger setting internal context flag
CREATE OR REPLACE FUNCTION public.update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM set_config('sakay.internal_context', 'true', true);

    UPDATE public.driver
    SET weighted_average_rating = (
        SELECT ROUND(AVG(stars)::numeric, 2)
        FROM public.rating
        WHERE ratee_id = NEW.ratee_id
    )
    WHERE driver_id = NEW.ratee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_update_driver_rating ON public.rating;
CREATE TRIGGER trigger_update_driver_rating
    AFTER INSERT OR UPDATE ON public.rating
    FOR EACH ROW
    EXECUTE FUNCTION public.update_driver_rating();


-- ----------------------------------------------------------------------------
-- 7. SLA REVIEW AGE, EXPIRY CASCADE & AVAILABILITY RESTRICTIONS (Section 24)
-- ----------------------------------------------------------------------------

-- Canonical function calculating review age in Asia/Manila calendar days
CREATE OR REPLACE FUNCTION public.calculate_review_age_days(
    p_submitted_at TIMESTAMPTZ,
    p_resubmitted_at TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
    v_clock_start TIMESTAMPTZ;
    v_now_manila DATE;
    v_start_manila DATE;
BEGIN
    v_clock_start := COALESCE(p_resubmitted_at, p_submitted_at);
    IF v_clock_start IS NULL THEN
        RETURN 0;
    END IF;

    v_now_manila := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;
    v_start_manila := (v_clock_start AT TIME ZONE 'Asia/Manila')::DATE;

    RETURN GREATEST(0, (v_now_manila - v_start_manila));
END;
$$ LANGUAGE plpgsql STABLE;

-- Authoritative function checking if driver is documentarily restricted (Rule 24.1 - 24.3, PI-13)
CREATE OR REPLACE FUNCTION public.is_driver_documentarily_restricted(p_driver_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_driver public.driver;
    v_affiliation public.driver_toda_affiliation;
    v_toda public.toda;
    v_manila_date DATE;
    v_license_expired BOOLEAN := FALSE;
    v_mtop_expired BOOLEAN := FALSE;
    v_toda_expired BOOLEAN := FALSE;
    v_no_active_affiliation BOOLEAN := FALSE;
    v_is_restricted BOOLEAN := FALSE;
    v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT * INTO v_driver FROM public.driver WHERE driver_id = p_driver_id;
    IF v_driver.driver_id IS NULL THEN
        RETURN jsonb_build_object('is_restricted', true, 'reasons', ARRAY['Driver record not found']);
    END IF;

    IF v_driver.is_permanently_disqualified = TRUE THEN
        RETURN jsonb_build_object('is_restricted', true, 'reasons', ARRAY['Driver is permanently disqualified: ' || COALESCE(v_driver.disqualification_reason, 'No reason specified')]);
    END IF;

    v_manila_date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;

    -- Check driver's license expiration
    IF v_driver.license_expiry IS NOT NULL AND v_driver.license_expiry < v_manila_date THEN
        v_license_expired := TRUE;
        v_is_restricted := TRUE;
        v_reasons := array_append(v_reasons, 'Driver''s License has expired (' || v_driver.license_expiry::TEXT || ')');
    END IF;

    -- Check MTOP expiration
    IF v_driver.mtop_expiry IS NOT NULL AND v_driver.mtop_expiry < v_manila_date THEN
        v_mtop_expired := TRUE;
        v_is_restricted := TRUE;
        v_reasons := array_append(v_reasons, 'MTOP Franchise permit has expired (' || v_driver.mtop_expiry::TEXT || ')');
    END IF;

    -- Check active TODA affiliation (PI-13: affiliation-scoped)
    SELECT * INTO v_affiliation 
    FROM public.driver_toda_affiliation 
    WHERE driver_id = p_driver_id AND is_active_selection = TRUE
    LIMIT 1;

    IF v_affiliation.affiliation_id IS NULL 
       OR v_affiliation.toda_endorsement_status != 'Endorsed' 
       OR v_affiliation.lgu_verification_status != 'Approved' THEN
        v_no_active_affiliation := TRUE;
        v_is_restricted := TRUE;
        v_reasons := array_append(v_reasons, 'No active, verified TODA affiliation selected');
    ELSE
        SELECT * INTO v_toda FROM public.toda WHERE toda_id = v_affiliation.toda_id;
        IF v_toda.toda_id IS NOT NULL THEN
            IF (v_toda.certificate_expiry IS NOT NULL AND (v_toda.certificate_expiry AT TIME ZONE 'Asia/Manila')::DATE < v_manila_date)
               OR v_toda.toda_status != 'Active' THEN
                v_toda_expired := TRUE;
                v_is_restricted := TRUE;
                v_reasons := array_append(v_reasons, 'Selected TODA (' || v_toda.toda_name || ') accreditation has expired or is inactive');
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'is_restricted', v_is_restricted,
        'license_expired', v_license_expired,
        'mtop_expired', v_mtop_expired,
        'toda_expired', v_toda_expired,
        'no_active_affiliation', v_no_active_affiliation,
        'reasons', to_jsonb(v_reasons)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger: Block driver from going 'Available' from 'Offline' if documentarily restricted or unverified
CREATE OR REPLACE FUNCTION public.check_driver_online_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_res JSONB;
BEGIN
    -- Block transition from Offline -> Available / Busy
    IF (OLD.availability_status = 'Offline' AND NEW.availability_status IN ('Available', 'Busy')) THEN
        IF NEW.account_status != 'Verified' THEN
            RAISE EXCEPTION 'ERR_DRIVER_NOT_VERIFIED: Hindi maaaring mag-online hangga''t hindi ganap na aprubado ng LGU ang account (Driver must be Verified by LGU before going online).';
        END IF;

        v_res := public.is_driver_documentarily_restricted(NEW.driver_id);
        IF (v_res->>'is_restricted')::BOOLEAN = TRUE THEN
            RAISE EXCEPTION 'ERR_DOCUMENT_EXPIRED: Hindi maaaring mag-online dahil sa expired o kulang na dokumento: %', v_res->>'reasons';
        END IF;
    END IF;

    -- When a trip completes (Busy -> Available), check if restriction occurred during trip
    IF (OLD.availability_status = 'Busy' AND NEW.availability_status = 'Available') THEN
        v_res := public.is_driver_documentarily_restricted(NEW.driver_id);
        IF (v_res->>'is_restricted')::BOOLEAN = TRUE THEN
            NEW.availability_status := 'Offline';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_check_driver_online_eligibility ON public.driver;
CREATE TRIGGER trigger_check_driver_online_eligibility
    BEFORE UPDATE OF availability_status ON public.driver
    FOR EACH ROW
    EXECUTE FUNCTION public.check_driver_online_eligibility();


-- ----------------------------------------------------------------------------
-- 8. AUDIT LOG EXTENSIONS (Rule W12)
-- ----------------------------------------------------------------------------

ALTER TABLE public.audit_log
    ADD COLUMN IF NOT EXISTS actor_id UUID,
    ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50),
    ADD COLUMN IF NOT EXISTS before_state JSONB,
    ADD COLUMN IF NOT EXISTS after_state JSONB;


-- ----------------------------------------------------------------------------
-- 9. SECURITY DEFINER ADMINISTRATIVE & LIFECYCLE RPCS
-- ----------------------------------------------------------------------------

-- Drop old approve_toda_accreditation overload (Requirement A3)
DROP FUNCTION IF EXISTS public.approve_toda_accreditation(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.approve_toda_accreditation(UUID, TEXT, TIMESTAMPTZ, TEXT);

-- RPC: Approve TODA Accreditation with LGU-entered Certificate Expiry (Rule 2.1, Requirement A3)
CREATE OR REPLACE FUNCTION public.approve_toda_accreditation(
    p_toda_id UUID,
    p_certificate_number TEXT,
    p_certificate_expiry TIMESTAMPTZ,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_toda public.toda;
    v_old_state JSONB;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only LGU Administrators can approve TODA accreditation.');
    END IF;

    IF p_certificate_number IS NULL OR trim(p_certificate_number) = '' OR p_certificate_expiry IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Official Certificate Number and Expiration Date are mandatory.');
    END IF;

    IF (p_certificate_expiry AT TIME ZONE 'Asia/Manila')::DATE <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Certificate expiry date must be in the future.');
    END IF;

    -- Match exact ID only (no ILIKE)
    SELECT * INTO v_toda FROM public.toda WHERE toda_id = p_toda_id;

    IF v_toda.toda_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'TODA record not found.');
    END IF;

    v_old_state := to_jsonb(v_toda);

    PERFORM set_config('sakay.internal_context', 'true', true);

    UPDATE public.toda
    SET toda_status = 'Active',
        account_status = 'Active',
        certificate_number = p_certificate_number,
        certificate_expiry = p_certificate_expiry
    WHERE toda_id = p_toda_id
    RETURNING * INTO v_toda;

    UPDATE public.toda_admin
    SET account_status = 'Active'
    WHERE toda_id = p_toda_id;

    -- Record immutable audit log
    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, before_state, after_state, performed_at
    ) VALUES (
        'TODA_ACCREDITATION_APPROVED',
        p_toda_id::TEXT,
        auth.uid(),
        'lgu_admin',
        'Approved municipal accreditation for TODA ''' || v_toda.toda_name || '''. Cert: ' || p_certificate_number || '. ' || COALESCE(p_remarks, ''),
        v_old_state,
        to_jsonb(v_toda),
        CURRENT_TIMESTAMP
    );

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_toda));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Select Active Driver Affiliation (Rule 3.10, Requirements A1, A2)
CREATE OR REPLACE FUNCTION public.select_active_driver_affiliation(
    p_affiliation_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.driver_toda_affiliation;
    v_driver public.driver;
    v_toda public.toda;
BEGIN
    SELECT * INTO v_aff FROM public.driver_toda_affiliation WHERE affiliation_id = p_affiliation_id;
    IF v_aff.affiliation_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affiliation record not found.');
    END IF;

    -- Must belong to authenticated driver
    SELECT * INTO v_driver FROM public.driver WHERE driver_id = v_aff.driver_id;
    IF v_driver.driver_id IS NULL OR (v_driver.auth_user_id != auth.uid() AND NOT public.is_lgu_admin()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: You can only select an active affiliation for your own account.');
    END IF;

    IF v_driver.availability_status != 'Offline' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ERR_MUST_BE_OFFLINE: Bago magpalit ng aktibong TODA, kailangan munang mag-Offline (Driver must be Offline before changing active TODA affiliation).');
    END IF;

    IF v_aff.toda_endorsement_status != 'Endorsed' OR v_aff.lgu_verification_status != 'Approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ERR_AFFILIATION_NOT_VERIFIED: Selected TODA affiliation is not fully verified.');
    END IF;

    SELECT * INTO v_toda FROM public.toda WHERE toda_id = v_aff.toda_id;
    IF v_toda.toda_id IS NULL OR v_toda.toda_status != 'Active' 
       OR (v_toda.certificate_expiry IS NOT NULL AND (v_toda.certificate_expiry AT TIME ZONE 'Asia/Manila')::DATE < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot select an inactive or expired TODA.');
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    -- Activate target affiliation, deactivate others for this driver
    UPDATE public.driver_toda_affiliation
    SET is_active_selection = FALSE
    WHERE driver_id = v_aff.driver_id AND affiliation_id != p_affiliation_id;

    UPDATE public.driver_toda_affiliation
    SET is_active_selection = TRUE,
        updated_at = CURRENT_TIMESTAMP
    WHERE affiliation_id = p_affiliation_id;

    -- Update driver authoritative toda_id pointer
    UPDATE public.driver
    SET toda_id = v_aff.toda_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE driver_id = v_aff.driver_id;

    RETURN jsonb_build_object('success', true, 'active_toda_id', v_aff.toda_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: TODA Admin Endorses Driver Affiliation with Master Roster Matching (Rules 2.4, 3.1, Requirement A5, C13)
CREATE OR REPLACE FUNCTION public.endorse_driver_affiliation(
    p_affiliation_id UUID,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.driver_toda_affiliation;
    v_driver public.driver;
    v_toda public.toda;
    v_verif public.driver_verification;
    v_old_state JSONB;
    v_norm_franchise TEXT;
    v_norm_plate TEXT;
    v_roster_matched BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_aff FROM public.driver_toda_affiliation WHERE affiliation_id = p_affiliation_id;
    IF v_aff.affiliation_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affiliation record not found.');
    END IF;

    -- Verify caller is TODA Admin for this TODA or LGU Admin
    IF NOT (public.is_lgu_admin() OR (public.get_current_toda_admin_toda_id() IS NOT NULL AND v_aff.toda_id = public.get_current_toda_admin_toda_id())) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: You may only endorse drivers applying to your own TODA.');
    END IF;

    -- Require status 'Submitted'
    IF v_aff.toda_endorsement_status != 'Submitted' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Application is not in Submitted status.');
    END IF;

    -- Require TODA active and unexpired
    SELECT * INTO v_toda FROM public.toda WHERE toda_id = v_aff.toda_id;
    IF v_toda.toda_id IS NULL OR v_toda.toda_status != 'Active' 
       OR (v_toda.certificate_expiry IS NOT NULL AND (v_toda.certificate_expiry AT TIME ZONE 'Asia/Manila')::DATE < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot endorse driver for inactive or expired TODA.');
    END IF;

    SELECT * INTO v_driver FROM public.driver WHERE driver_id = v_aff.driver_id;
    IF v_driver.is_permanently_disqualified = TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver is permanently disqualified.');
    END IF;

    SELECT * INTO v_verif FROM public.driver_verification WHERE driver_id = v_aff.driver_id LIMIT 1;

    -- Primary match check on normalized franchise OR plate (Requirement C13: name alone does NOT pass)
    -- Requirement A5: only roster entries created BEFORE or AT the application's submitted_at count!
    v_norm_franchise := regexp_replace(upper(COALESCE(v_verif.submitted_franchise_number, v_driver.franchise_number, '')), '[^A-Z0-9]', '', 'g');
    v_norm_plate := regexp_replace(upper(COALESCE(v_verif.submitted_plate_number, v_driver.plate_number, '')), '[^A-Z0-9]', '', 'g');

    IF EXISTS (
        SELECT 1 FROM public.toda_roster_entry
        WHERE toda_id = v_aff.toda_id
          AND created_at <= v_aff.submitted_at
          AND (
            (v_norm_franchise != '' AND normalized_franchise = v_norm_franchise)
            OR (v_norm_plate != '' AND normalized_plate = v_norm_plate)
          )
    ) THEN
        v_roster_matched := TRUE;
    END IF;

    v_old_state := to_jsonb(v_aff);

    PERFORM set_config('sakay.internal_context', 'true', true);

    -- Complete Stage 1 endorsement
    UPDATE public.driver_toda_affiliation
    SET toda_endorsement_status = 'Endorsed',
        toda_endorsed_at = CURRENT_TIMESTAMP,
        toda_endorsed_by = (SELECT admin_id FROM public.toda_admin WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1),
        lgu_verification_status = 'Pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE affiliation_id = p_affiliation_id
    RETURNING * INTO v_aff;

    -- Update driver_verification status to maintain backward compatibility
    UPDATE public.driver_verification
    SET verification_status = 'Approved',
        endorsed_at = CURRENT_TIMESTAMP,
        reviewed_by = (SELECT admin_id FROM public.toda_admin WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1)
    WHERE driver_id = v_aff.driver_id;

    -- Rule 2.4: If driver not on roster, raise supervisory review flag for LGU (subject_type = driver_application)
    IF NOT v_roster_matched THEN
        INSERT INTO public.admin_review_flag (
            flag_type, subject_type, subject_id, source_rule, assigned_role, details
        ) VALUES (
            'ROSTER_MISMATCH',
            'driver_application',
            p_affiliation_id::TEXT,
            'Rule 2.4',
            'lgu_admin',
            jsonb_build_object(
                'affiliation_id', p_affiliation_id,
                'toda_id', v_aff.toda_id,
                'driver_id', v_aff.driver_id,
                'driver_name', v_driver.full_name,
                'franchise', v_driver.franchise_number,
                'plate', v_driver.plate_number,
                'reason', 'TODA endorsed driver applicant who does not match the pre-existing master roster.'
            )
        ) ON CONFLICT (subject_type, subject_id, flag_type) WHERE status IN ('Open', 'Under Review') DO NOTHING;
    END IF;

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, before_state, after_state, performed_at
    ) VALUES (
        'DRIVER_AFFILIATION_STAGE1_ENDORSED',
        p_affiliation_id::TEXT,
        auth.uid(),
        'toda_admin',
        'Endorsed driver ' || v_driver.full_name || ' for TODA affiliation. Roster matched: ' || v_roster_matched::TEXT,
        v_old_state,
        to_jsonb(v_aff),
        CURRENT_TIMESTAMP
    );

    PERFORM set_config('sakay.internal_context', '', false);
    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_aff), 'roster_matched', v_roster_matched);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: LGU Admin Final Verification of Driver Affiliation (Rule 3.1, Requirement A1, B9)
CREATE OR REPLACE FUNCTION public.verify_driver_affiliation(
    p_affiliation_id UUID,
    p_franchise_number TEXT DEFAULT NULL,
    p_license_expiry DATE DEFAULT NULL,
    p_mtop_expiry DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.driver_toda_affiliation;
    v_driver public.driver;
    v_toda public.toda;
    v_verif public.driver_verification;
    v_old_state JSONB;
    v_has_active_selection BOOLEAN;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only LGU Administrators can issue final verification.');
    END IF;

    SELECT * INTO v_aff FROM public.driver_toda_affiliation WHERE affiliation_id = p_affiliation_id;
    IF v_aff.affiliation_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affiliation record not found.');
    END IF;

    -- Sequential rule (Item A1): Require toda_endorsement_status = 'Endorsed'
    IF v_aff.toda_endorsement_status != 'Endorsed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sequential violation: Application must be endorsed by TODA Administrator first.');
    END IF;

    -- Require not already Approved
    IF v_aff.lgu_verification_status = 'Approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affiliation has already been approved.');
    END IF;

    -- Require TODA active and unexpired
    SELECT * INTO v_toda FROM public.toda WHERE toda_id = v_aff.toda_id;
    IF v_toda.toda_id IS NULL OR v_toda.toda_status != 'Active' 
       OR (v_toda.certificate_expiry IS NOT NULL AND (v_toda.certificate_expiry AT TIME ZONE 'Asia/Manila')::DATE < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot verify driver affiliation for inactive or expired TODA.');
    END IF;

    SELECT * INTO v_driver FROM public.driver WHERE driver_id = v_aff.driver_id;
    IF v_driver.is_permanently_disqualified = TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver is permanently disqualified.');
    END IF;

    SELECT * INTO v_verif FROM public.driver_verification WHERE driver_id = v_aff.driver_id LIMIT 1;
    v_old_state := to_jsonb(v_aff);

    PERFORM set_config('sakay.internal_context', 'true', true);

    -- Check if driver already has an active selection
    SELECT EXISTS (
        SELECT 1 FROM public.driver_toda_affiliation 
        WHERE driver_id = v_aff.driver_id AND is_active_selection = TRUE AND affiliation_id != p_affiliation_id
    ) INTO v_has_active_selection;

    -- Approve affiliation; only set active selection if driver has none yet
    UPDATE public.driver_toda_affiliation
    SET lgu_verification_status = 'Approved',
        lgu_verified_at = CURRENT_TIMESTAMP,
        lgu_verified_by = (SELECT admin_id FROM public.lgu_admin WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1),
        is_active_selection = CASE WHEN v_has_active_selection THEN FALSE ELSE TRUE END,
        updated_at = CURRENT_TIMESTAMP
    WHERE affiliation_id = p_affiliation_id
    RETURNING * INTO v_aff;

    -- Update driver table (Item A1): Only set driver.account_status = 'Verified' when it is 'Pending Verification' or 'Resubmission Required'; NEVER change Suspended, Deactivated or Rejected drivers.
    UPDATE public.driver
    SET account_status = CASE 
            WHEN is_permanently_disqualified = TRUE THEN account_status
            WHEN account_status IN ('Pending Verification', 'Resubmission Required') THEN 'Verified'
            ELSE account_status
        END,
        toda_id = CASE WHEN v_aff.is_active_selection THEN v_aff.toda_id ELSE toda_id END,
        franchise_number = COALESCE(p_franchise_number, v_verif.submitted_franchise_number, franchise_number),
        license_expiry = COALESCE(p_license_expiry, v_verif.license_expiry, license_expiry),
        mtop_expiry = COALESCE(p_mtop_expiry, v_verif.mtop_expiry, v_verif.franchise_expiry, mtop_expiry),
        lgu_approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE driver_id = v_aff.driver_id
    RETURNING * INTO v_driver;

    UPDATE public.driver_verification
    SET verification_status = 'Approved',
        reviewed_by_lgu = (SELECT admin_id FROM public.lgu_admin WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1),
        lgu_approved_at = CURRENT_TIMESTAMP
    WHERE driver_id = v_aff.driver_id;

    -- Close open overdue and roster mismatch flags for this affiliation
    UPDATE public.admin_review_flag
    SET status = 'Resolved',
        resolution = 'LGU Admin approved application.',
        resolved_at = CURRENT_TIMESTAMP,
        resolved_by = auth.uid()
    WHERE subject_id = p_affiliation_id::TEXT 
      AND flag_type IN ('APPLICATION_OVERDUE', 'ROSTER_MISMATCH') 
      AND status IN ('Open', 'Under Review');

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, before_state, after_state, performed_at
    ) VALUES (
        'DRIVER_AFFILIATION_STAGE2_VERIFIED',
        p_affiliation_id::TEXT,
        auth.uid(),
        'lgu_admin',
        'LGU approved and accredited driver ' || v_driver.full_name || '.',
        v_old_state,
        to_jsonb(v_aff),
        CURRENT_TIMESTAMP
    );

    PERFORM set_config('sakay.internal_context', '', false);
    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_aff));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Return Driver Application for Correction (Rules 3.6, 3.8, Item A4, A6)
CREATE OR REPLACE FUNCTION public.return_driver_affiliation(
    p_affiliation_id UUID,
    p_reason TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.driver_toda_affiliation;
    v_driver public.driver;
    v_old_state JSONB;
BEGIN
    SELECT * INTO v_aff FROM public.driver_toda_affiliation WHERE affiliation_id = p_affiliation_id;
    IF v_aff.affiliation_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affiliation record not found.');
    END IF;

    IF NOT (public.is_lgu_admin() OR (public.get_current_toda_admin_toda_id() IS NOT NULL AND v_aff.toda_id = public.get_current_toda_admin_toda_id())) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied.');
    END IF;

    SELECT * INTO v_driver FROM public.driver WHERE driver_id = v_aff.driver_id;
    v_old_state := to_jsonb(v_aff);

    PERFORM set_config('sakay.internal_context', 'true', true);

    IF public.is_lgu_admin() THEN
        UPDATE public.driver_toda_affiliation
        SET lgu_verification_status = 'Resubmission Required',
            lgu_rejection_reason = p_reason,
            lgu_return_notes = p_notes,
            updated_at = CURRENT_TIMESTAMP
        WHERE affiliation_id = p_affiliation_id;

        -- Only LGU changes driver.account_status
        IF v_driver.account_status IN ('Pending Verification', 'Resubmission Required') THEN
            UPDATE public.driver
            SET account_status = 'Resubmission Required',
                rejection_reason = p_reason,
                rejection_comment = p_notes,
                updated_at = CURRENT_TIMESTAMP
            WHERE driver_id = v_aff.driver_id;
        END IF;
    ELSE
        UPDATE public.driver_toda_affiliation
        SET toda_endorsement_status = 'Resubmission Required',
            toda_rejection_reason = p_reason,
            toda_return_notes = p_notes,
            updated_at = CURRENT_TIMESTAMP
        WHERE affiliation_id = p_affiliation_id;

        -- TODA admin does NOT touch driver.account_status!
    END IF;

    UPDATE public.driver_verification
    SET verification_status = 'Resubmission Required',
        rejection_reason = p_reason,
        rejection_comment = p_notes
    WHERE driver_id = v_aff.driver_id;

    -- Resolve open overdue flag
    UPDATE public.admin_review_flag
    SET status = 'Resolved',
        resolution = 'Application returned for correction: ' || p_reason,
        resolved_at = CURRENT_TIMESTAMP,
        resolved_by = auth.uid()
    WHERE subject_id = p_affiliation_id::TEXT AND flag_type = 'APPLICATION_OVERDUE' AND status IN ('Open', 'Under Review');

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, before_state, performed_at
    ) VALUES (
        'DRIVER_APPLICATION_RETURNED',
        p_affiliation_id::TEXT,
        auth.uid(),
        CASE WHEN public.is_lgu_admin() THEN 'lgu_admin' ELSE 'toda_admin' END,
        'Returned application for correction. Reason: ' || p_reason,
        v_old_state,
        CURRENT_TIMESTAMP
    );

    PERFORM set_config('sakay.internal_context', '', false);
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Reject Driver Application with Mandatory Reason Category (Rule 3.8, Item A4, A6)
CREATE OR REPLACE FUNCTION public.reject_driver_affiliation(
    p_affiliation_id UUID,
    p_reason_category TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.driver_toda_affiliation;
    v_driver public.driver;
    v_old_state JSONB;
BEGIN
    SELECT * INTO v_aff FROM public.driver_toda_affiliation WHERE affiliation_id = p_affiliation_id;
    IF v_aff.affiliation_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affiliation record not found.');
    END IF;

    IF NOT (public.is_lgu_admin() OR (public.get_current_toda_admin_toda_id() IS NOT NULL AND v_aff.toda_id = public.get_current_toda_admin_toda_id())) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: You may only review applications for your own TODA.');
    END IF;

    -- Mandatory reason category check (Rule 3.8, Item A4)
    IF p_reason_category NOT IN ('ineligible', 'fraudulent') THEN
        RETURN jsonb_build_object('success', false, 'error', 'ERR_INVALID_REJECTION_REASON: Mandatory reason category must be ''ineligible'' or ''fraudulent''. Document issues must use return_driver_affiliation (Rule 3.8).');
    END IF;

    SELECT * INTO v_driver FROM public.driver WHERE driver_id = v_aff.driver_id;
    v_old_state := to_jsonb(v_aff);

    PERFORM set_config('sakay.internal_context', 'true', true);

    IF public.is_lgu_admin() THEN
        UPDATE public.driver_toda_affiliation
        SET lgu_verification_status = 'Rejected',
            lgu_rejection_reason = p_reason_category || ': ' || COALESCE(p_notes, ''),
            updated_at = CURRENT_TIMESTAMP
        WHERE affiliation_id = p_affiliation_id;

        IF v_driver.account_status != 'Verified' THEN
            UPDATE public.driver
            SET account_status = 'Rejected',
                rejection_reason = p_reason_category,
                rejection_comment = p_notes,
                rejected_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE driver_id = v_aff.driver_id;
        END IF;
    ELSE
        UPDATE public.driver_toda_affiliation
        SET toda_endorsement_status = 'Rejected',
            toda_rejection_reason = p_reason_category || ': ' || COALESCE(p_notes, ''),
            updated_at = CURRENT_TIMESTAMP
        WHERE affiliation_id = p_affiliation_id;

        -- TODA admin does NOT change driver.account_status!
    END IF;

    UPDATE public.driver_verification
    SET verification_status = 'Rejected',
        rejection_reason = p_reason_category,
        rejection_comment = p_notes
    WHERE driver_id = v_aff.driver_id;

    -- Resolve overdue flag
    UPDATE public.admin_review_flag
    SET status = 'Resolved',
        resolution = 'Application rejected (' || p_reason_category || '): ' || COALESCE(p_notes, ''),
        resolved_at = CURRENT_TIMESTAMP,
        resolved_by = auth.uid()
    WHERE subject_id = p_affiliation_id::TEXT AND flag_type = 'APPLICATION_OVERDUE' AND status IN ('Open', 'Under Review');

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, before_state, performed_at
    ) VALUES (
        'DRIVER_AFFILIATION_REJECTED',
        p_affiliation_id::TEXT,
        auth.uid(),
        CASE WHEN public.is_lgu_admin() THEN 'lgu_admin' ELSE 'toda_admin' END,
        'Rejected driver affiliation (' || p_reason_category || '). ' || COALESCE(p_notes, ''),
        v_old_state,
        CURRENT_TIMESTAMP
    );

    PERFORM set_config('sakay.internal_context', '', false);
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Resubmit Driver Application (Item A3, A6, C17)
CREATE OR REPLACE FUNCTION public.resubmit_driver_application(
    p_affiliation_id UUID,
    p_submitted_documents JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.driver_toda_affiliation;
    v_driver public.driver;
BEGIN
    SELECT * INTO v_aff FROM public.driver_toda_affiliation WHERE affiliation_id = p_affiliation_id;
    IF v_aff.affiliation_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affiliation not found.');
    END IF;

    -- Allow only when in 'Resubmission Required' (TODA or LGU stage) (Item A3)
    IF NOT (v_aff.toda_endorsement_status = 'Resubmission Required' OR v_aff.lgu_verification_status = 'Resubmission Required') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only applications marked Resubmission Required can be resubmitted. Approved or Rejected records cannot be reset.');
    END IF;

    -- Block if already Rejected or Approved
    IF v_aff.toda_endorsement_status = 'Rejected' OR v_aff.lgu_verification_status = 'Rejected' 
       OR v_aff.lgu_verification_status = 'Approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot resubmit an affiliation that is Approved or Rejected.');
    END IF;

    SELECT * INTO v_driver FROM public.driver WHERE driver_id = v_aff.driver_id;
    IF v_driver.driver_id IS NULL OR (v_driver.auth_user_id != auth.uid() AND NOT public.is_lgu_admin()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: You may only resubmit for your own account.');
    END IF;

    IF v_driver.is_permanently_disqualified = TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver is permanently disqualified.');
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    -- Decision A: Stage-preserving resubmission logic
    -- When returned at LGU stage: keep toda_endorsement_status 'Endorsed', resume at LGU stage (lgu_verification_status = 'Pending')
    -- When returned at TODA stage: resume at TODA stage (toda_endorsement_status = 'Submitted', lgu_verification_status = 'Pending')
    -- Both restart the 5-day review clock (resubmitted_at = CURRENT_TIMESTAMP)
    IF v_aff.lgu_verification_status = 'Resubmission Required' THEN
        UPDATE public.driver_toda_affiliation
        SET toda_endorsement_status = 'Endorsed',
            lgu_verification_status = 'Pending',
            lgu_rejection_reason = NULL,
            lgu_return_notes = NULL,
            resubmitted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE affiliation_id = p_affiliation_id;
    ELSE
        UPDATE public.driver_toda_affiliation
        SET toda_endorsement_status = 'Submitted',
            lgu_verification_status = 'Pending',
            toda_rejection_reason = NULL,
            toda_return_notes = NULL,
            lgu_rejection_reason = NULL,
            lgu_return_notes = NULL,
            resubmitted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE affiliation_id = p_affiliation_id;
    END IF;

    IF v_driver.account_status != 'Verified' THEN
        UPDATE public.driver
        SET account_status = 'Pending Verification',
            rejection_reason = NULL,
            rejection_comment = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = v_aff.driver_id;
    END IF;

    UPDATE public.driver_verification
    SET verification_status = 'Pending',
        rejection_reason = NULL,
        rejection_comment = NULL
    WHERE driver_id = v_aff.driver_id;

    -- Resolve overdue flag (Item A6)
    UPDATE public.admin_review_flag
    SET status = 'Resolved',
        resolution = 'Driver resubmitted application; review clock reset.',
        resolved_at = CURRENT_TIMESTAMP,
        resolved_by = auth.uid()
    WHERE subject_id = p_affiliation_id::TEXT AND flag_type = 'APPLICATION_OVERDUE' AND status IN ('Open', 'Under Review');

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, performed_at
    ) VALUES (
        'DRIVER_APPLICATION_RESUBMITTED',
        p_affiliation_id::TEXT,
        auth.uid(),
        'driver',
        'Resubmitted driver affiliation application.',
        CURRENT_TIMESTAMP
    );

    PERFORM set_config('sakay.internal_context', '', false);
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Submit Driver Document Renewal (Rules 24.2, Item A7, C17)
CREATE OR REPLACE FUNCTION public.submit_driver_renewal(
    p_driver_id UUID,
    p_license_expiry DATE DEFAULT NULL,
    p_mtop_expiry DATE DEFAULT NULL,
    p_license_photo_url TEXT DEFAULT NULL,
    p_mtop_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_driver public.driver;
    v_now_manila DATE;
BEGIN
    SELECT * INTO v_driver FROM public.driver WHERE driver_id = p_driver_id;
    IF v_driver.driver_id IS NULL OR (v_driver.auth_user_id != auth.uid() AND NOT public.is_lgu_admin()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: You may only submit renewal for your own account.');
    END IF;

    -- Require new expiry date in the future (Asia/Manila calendar date) (Item A7)
    v_now_manila := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;
    IF p_license_expiry IS NOT NULL AND p_license_expiry <= v_now_manila THEN
        RETURN jsonb_build_object('success', false, 'error', 'License expiry date must be in the future.');
    END IF;
    IF p_mtop_expiry IS NOT NULL AND p_mtop_expiry <= v_now_manila THEN
        RETURN jsonb_build_object('success', false, 'error', 'MTOP expiry date must be in the future.');
    END IF;
    IF p_license_expiry IS NULL AND p_mtop_expiry IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'At least one new expiry date must be provided.');
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    -- Store pending renewal values in driver_verification; does NOT change driver authoritative expiry
    UPDATE public.driver_verification
    SET pending_license_expiry = COALESCE(p_license_expiry, pending_license_expiry),
        pending_mtop_expiry = COALESCE(p_mtop_expiry, pending_mtop_expiry),
        pending_license_photo_url = COALESCE(p_license_photo_url, pending_license_photo_url),
        pending_mtop_photo_url = COALESCE(p_mtop_photo_url, pending_mtop_photo_url),
        renewal_status = 'Pending LGU Verification'
    WHERE driver_id = p_driver_id;

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, performed_at
    ) VALUES (
        'DRIVER_DOCUMENT_RENEWAL_SUBMITTED',
        p_driver_id::TEXT,
        auth.uid(),
        'driver',
        'Submitted document renewal for LGU verification.',
        CURRENT_TIMESTAMP
    );

    -- Notify driver (Item A7)
    INSERT INTO public.notification (
        recipient_id, driver_id, title, message, notification_type, threshold_days, sent_at
    ) VALUES (
        p_driver_id::TEXT,
        p_driver_id,
        'Naisumite ang Renewal ng Dokumento',
        'Ang iyong kahilingan para sa renewal ng dokumento ay matagumpay na naisumite at kasalukuyang sinusuri ng LGU Administrator.',
        'DOCUMENT_RENEWAL_SUBMITTED',
        0,
        CURRENT_TIMESTAMP
    );

    PERFORM set_config('sakay.internal_context', '', false);
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Verify Driver Document Renewal (LGU only writes authoritative expiry) (Rules 24.2, Item A7, C17)
CREATE OR REPLACE FUNCTION public.verify_driver_renewal(
    p_driver_id UUID,
    p_approved BOOLEAN,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_verif public.driver_verification;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only LGU Administrators can verify document renewals.');
    END IF;

    SELECT * INTO v_verif FROM public.driver_verification WHERE driver_id = p_driver_id LIMIT 1;
    IF v_verif.driver_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Verification record not found.');
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    IF p_approved THEN
        UPDATE public.driver
        SET license_expiry = COALESCE(v_verif.pending_license_expiry, license_expiry),
            mtop_expiry = COALESCE(v_verif.pending_mtop_expiry, mtop_expiry),
            updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = p_driver_id;

        UPDATE public.driver_verification
        SET renewal_status = 'Approved',
            pending_license_expiry = NULL,
            pending_mtop_expiry = NULL
        WHERE driver_id = p_driver_id;
    ELSE
        UPDATE public.driver_verification
        SET renewal_status = 'Rejected'
        WHERE driver_id = p_driver_id;
    END IF;

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, performed_at
    ) VALUES (
        'DRIVER_DOCUMENT_RENEWAL_VERIFIED',
        p_driver_id::TEXT,
        auth.uid(),
        'lgu_admin',
        'LGU renewal verification decision: ' || CASE WHEN p_approved THEN 'Approved' ELSE 'Rejected' END || '. ' || COALESCE(p_remarks, ''),
        CURRENT_TIMESTAMP
    );

    -- Notify driver (Item A7)
    INSERT INTO public.notification (
        recipient_id, driver_id, title, message, notification_type, threshold_days, sent_at
    ) VALUES (
        p_driver_id::TEXT,
        p_driver_id,
        CASE WHEN p_approved THEN 'Aprubado ang Renewal ng Dokumento' ELSE 'Tinanggihan ang Renewal ng Dokumento' END,
        CASE WHEN p_approved 
             THEN 'Matagumpay na na-update ng LGU Administrator ang iyong bagong petsa ng dokumento.' 
             ELSE 'Tinanggihan ng LGU ang renewal: ' || COALESCE(p_remarks, 'Hindi kumpleto o malabo ang isinumiteng dokumento.') 
        END,
        'DOCUMENT_RENEWAL_DECISION',
        0,
        CURRENT_TIMESTAMP
    );

    PERFORM set_config('sakay.internal_context', '', false);
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Apply for TODA Affiliation (Requirement C17)
CREATE OR REPLACE FUNCTION public.apply_driver_toda_affiliation(
    p_toda_id UUID,
    p_membership_number TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_driver public.driver;
    v_toda public.toda;
    v_aff public.driver_toda_affiliation;
BEGIN
    SELECT * INTO v_driver FROM public.driver WHERE auth_user_id = auth.uid();
    IF v_driver.driver_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver profile not found.');
    END IF;

    IF v_driver.is_permanently_disqualified = TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver is permanently disqualified from TODA affiliations.');
    END IF;

    IF v_driver.account_status = 'Rejected' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver account is rejected. Re-application must be allowed by an administrator.');
    END IF;

    SELECT * INTO v_aff FROM public.driver_toda_affiliation WHERE driver_id = v_driver.driver_id AND toda_id = p_toda_id;
    IF v_aff.affiliation_id IS NOT NULL AND (v_aff.toda_endorsement_status = 'Rejected' OR v_aff.lgu_verification_status = 'Rejected') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Previous application to this TODA was rejected. Re-application must be allowed by an administrator.');
    END IF;

    SELECT * INTO v_toda FROM public.toda WHERE toda_id = p_toda_id;
    IF v_toda.toda_id IS NULL OR v_toda.toda_status != 'Active' 
       OR (v_toda.certificate_expiry IS NOT NULL AND (v_toda.certificate_expiry AT TIME ZONE 'Asia/Manila')::DATE < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selected TODA is inactive or its accreditation has expired.');
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    INSERT INTO public.driver_toda_affiliation (
        driver_id,
        toda_id,
        toda_membership_number,
        toda_endorsement_status,
        lgu_verification_status,
        is_active_selection,
        submitted_at
    ) VALUES (
        v_driver.driver_id,
        p_toda_id,
        p_membership_number,
        'Submitted',
        'Pending',
        FALSE,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (driver_id, toda_id) DO UPDATE
    SET toda_endorsement_status = 'Submitted',
        lgu_verification_status = 'Pending',
        resubmitted_at = CURRENT_TIMESTAMP
    RETURNING * INTO v_aff;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_aff));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Permanently Disqualify Driver (Rule 3.9)
CREATE OR REPLACE FUNCTION public.permanently_disqualify_driver(
    p_driver_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only LGU Administrators can issue permanent disqualification.');
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    UPDATE public.driver
    SET is_permanently_disqualified = TRUE,
        disqualification_reason = p_reason,
        disqualified_at = CURRENT_TIMESTAMP,
        disqualified_by = (SELECT admin_id FROM public.lgu_admin WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1),
        account_status = 'Rejected',
        availability_status = 'Offline'
    WHERE driver_id = p_driver_id;

    UPDATE public.driver_toda_affiliation
    SET lgu_verification_status = 'Rejected',
        lgu_rejection_reason = 'Permanently disqualified: ' || p_reason
    WHERE driver_id = p_driver_id;

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, performed_at
    ) VALUES (
        'DRIVER_PERMANENTLY_DISQUALIFIED',
        p_driver_id::TEXT,
        auth.uid(),
        'lgu_admin',
        'Permanently disqualified driver. Reason: ' || p_reason,
        CURRENT_TIMESTAMP
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Allow Driver Re-application (Rule 3.9)
-- Audited administrative action for TODA or LGU administrator to clear a rejection
CREATE OR REPLACE FUNCTION public.allow_driver_reapplication(
    p_affiliation_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.driver_toda_affiliation;
    v_driver public.driver;
    v_old_state JSONB;
BEGIN
    SELECT * INTO v_aff FROM public.driver_toda_affiliation WHERE affiliation_id = p_affiliation_id;
    IF v_aff.affiliation_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affiliation record not found.');
    END IF;

    -- Verify caller is TODA Admin for this TODA or LGU Admin
    IF NOT (public.is_lgu_admin() OR (public.get_current_toda_admin_toda_id() IS NOT NULL AND v_aff.toda_id = public.get_current_toda_admin_toda_id())) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only LGU admin or the TODA admin for this affiliation can allow re-application.');
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'A valid reason is required to allow re-application.');
    END IF;

    SELECT * INTO v_driver FROM public.driver WHERE driver_id = v_aff.driver_id;
    IF v_driver.driver_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver profile not found.');
    END IF;

    -- Permanently disqualified drivers can NEVER be cleared (Rule 3.9)
    IF v_driver.is_permanently_disqualified = TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permanently disqualified driver cannot be cleared for re-application.');
    END IF;

    -- Must be currently rejected
    IF NOT (v_aff.toda_endorsement_status = 'Rejected' OR v_aff.lgu_verification_status = 'Rejected' OR v_driver.account_status = 'Rejected') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only rejected applications can be cleared for re-application.');
    END IF;

    v_old_state := to_jsonb(v_aff);

    PERFORM set_config('sakay.internal_context', 'true', true);

    -- Clear rejection on affiliation: reset to Submitted so driver can resume or re-apply
    UPDATE public.driver_toda_affiliation
    SET toda_endorsement_status = 'Submitted',
        lgu_verification_status = 'Pending',
        toda_rejection_reason = NULL,
        lgu_rejection_reason = NULL,
        toda_return_notes = NULL,
        lgu_return_notes = NULL,
        submitted_at = CURRENT_TIMESTAMP,
        resubmitted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE affiliation_id = p_affiliation_id;

    -- Clear driver account rejection status
    UPDATE public.driver
    SET account_status = 'Pending Verification',
        rejection_reason = NULL,
        rejection_comment = NULL,
        rejected_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE driver_id = v_aff.driver_id;

    UPDATE public.driver_verification
    SET verification_status = 'Pending',
        rejection_reason = NULL,
        rejection_comment = NULL
    WHERE driver_id = v_aff.driver_id;

    -- Write immutable audit log
    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, before_state, performed_at
    ) VALUES (
        'DRIVER_REAPPLICATION_ALLOWED',
        p_affiliation_id::TEXT,
        auth.uid(),
        CASE WHEN public.is_lgu_admin() THEN 'lgu_admin' ELSE 'toda_admin' END,
        'Cleared rejection to allow driver re-application. Reason: ' || p_reason,
        v_old_state,
        CURRENT_TIMESTAMP
    );

    PERFORM set_config('sakay.internal_context', '', false);

    RETURN jsonb_build_object('success', true, 'message', 'Re-application allowed. Driver application reset to Submitted.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Request Terminal Relocation (Rule 2.2)
CREATE OR REPLACE FUNCTION public.request_terminal_relocation(
    p_toda_id UUID,
    p_new_latitude DOUBLE PRECISION,
    p_new_longitude DOUBLE PRECISION,
    p_new_location TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    IF NOT (public.is_lgu_admin() OR (public.get_current_toda_admin_toda_id() IS NOT NULL AND p_toda_id = public.get_current_toda_admin_toda_id())) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: You may only request relocation for your own TODA.');
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    UPDATE public.toda
    SET pending_terminal_latitude = p_new_latitude,
        pending_terminal_longitude = p_new_longitude,
        pending_terminal_location = p_new_location,
        terminal_relocation_status = 'Pending LGU Re-approval',
        terminal_relocation_requested_at = CURRENT_TIMESTAMP
    WHERE toda_id = p_toda_id;

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, performed_at
    ) VALUES (
        'TODA_TERMINAL_RELOCATION_REQUESTED',
        p_toda_id::TEXT,
        auth.uid(),
        'toda_admin',
        'Requested terminal relocation to ' || p_new_location || '. Reason: ' || COALESCE(p_reason, 'N/A'),
        CURRENT_TIMESTAMP
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Approve Terminal Relocation (Rule 2.2)
CREATE OR REPLACE FUNCTION public.approve_terminal_relocation(
    p_toda_id UUID,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_toda public.toda;
    v_old_state JSONB;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only LGU Administrators can approve terminal relocation.');
    END IF;

    SELECT * INTO v_toda FROM public.toda WHERE toda_id = p_toda_id;
    IF v_toda.toda_id IS NULL OR v_toda.terminal_relocation_status != 'Pending LGU Re-approval' THEN
        RETURN jsonb_build_object('success', false, 'error', 'No pending terminal relocation found for this TODA.');
    END IF;

    v_old_state := to_jsonb(v_toda);

    PERFORM set_config('sakay.internal_context', 'true', true);

    UPDATE public.toda
    SET terminal_latitude = pending_terminal_latitude,
        terminal_longitude = pending_terminal_longitude,
        service_coverage_area = COALESCE(pending_terminal_location, service_coverage_area),
        pending_terminal_latitude = NULL,
        pending_terminal_longitude = NULL,
        pending_terminal_location = NULL,
        terminal_relocation_status = 'Approved'
    WHERE toda_id = p_toda_id
    RETURNING * INTO v_toda;

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, before_state, after_state, performed_at
    ) VALUES (
        'TODA_TERMINAL_RELOCATION_APPROVED',
        p_toda_id::TEXT,
        auth.uid(),
        'lgu_admin',
        'Approved terminal relocation for TODA ' || v_toda.toda_name || '. Remarks: ' || COALESCE(p_remarks, ''),
        v_old_state,
        to_jsonb(v_toda),
        CURRENT_TIMESTAMP
    );

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_toda));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Reject Terminal Relocation (Rule 2.2)
CREATE OR REPLACE FUNCTION public.reject_terminal_relocation(
    p_toda_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied.');
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    UPDATE public.toda
    SET pending_terminal_latitude = NULL,
        pending_terminal_longitude = NULL,
        pending_terminal_location = NULL,
        terminal_relocation_status = 'Rejected'
    WHERE toda_id = p_toda_id;

    INSERT INTO public.audit_log (
        action_type, target_id, actor_id, actor_role, details, performed_at
    ) VALUES (
        'TODA_TERMINAL_RELOCATION_REJECTED',
        p_toda_id::TEXT,
        auth.uid(),
        'lgu_admin',
        'Rejected terminal relocation. Reason: ' || COALESCE(p_reason, 'N/A'),
        CURRENT_TIMESTAMP
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Rule 2.5 Job: Check TODA excess incidents (stub returning 0 until Batch 11 defines 'upheld')
CREATE OR REPLACE FUNCTION public.check_toda_excess_incidents()
RETURNS INTEGER AS $$
BEGIN
    -- Batch 11 defines what constitutes an 'upheld' incident report.
    -- Stub returns 0 for now.
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC: Scheduled SLA Reminders, Overdue Flags & Expiry Cascade (Service role only, Requirement A4, A5, A8, C12)
CREATE OR REPLACE FUNCTION public.run_scheduled_sla_and_expiry_cascade()
RETURNS JSONB AS $$
DECLARE
    v_aff RECORD;
    v_driver RECORD;
    v_toda RECORD;
    v_age INTEGER;
    v_restr JSONB;
    v_reminders_count INTEGER := 0;
    v_overdue_count INTEGER := 0;
    v_restricted_count INTEGER := 0;
    v_now_manila DATE;
    v_stage_age INTEGER;
    v_lic_days INTEGER;
    v_mtop_days INTEGER;
    v_toda_days INTEGER;
    v_sla_deadline INTEGER;
    v_sla_reminder INTEGER;
    v_thresholds INTEGER[];
    v_t INTEGER;
BEGIN
    -- Session/Transaction Advisory Lock to prevent concurrent executions (Advisory key: 742901)
    IF NOT pg_try_advisory_xact_lock(742901) THEN
        RETURN jsonb_build_object(
            'success', false,
            'skipped', true,
            'reason', 'Concurrent execution locked by another process'
        );
    END IF;

    v_now_manila := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;

    -- Load configuration dynamically from central policy table (Requirement A8)
    v_sla_deadline := public.get_policy_config_int('driver_review_deadline_days', 5);
    v_sla_reminder := public.get_policy_config_int('driver_stage_reminder_days', 3);
    v_thresholds := public.get_policy_config_int_array('document_expiry_reminder_thresholds', ARRAY[30, 14, 3]);

    -- 1. Review SLA Evaluation & Reminders (Rule 3.7)
    FOR v_aff IN 
        SELECT a.*, d.full_name AS driver_name
        FROM public.driver_toda_affiliation a
        JOIN public.driver d ON a.driver_id = d.driver_id
        WHERE a.toda_endorsement_status NOT IN ('Resubmission Required', 'Rejected')
          AND a.lgu_verification_status NOT IN ('Approved', 'Resubmission Required', 'Rejected')
    LOOP
        v_age := public.calculate_review_age_days(v_aff.submitted_at, v_aff.resubmitted_at);

        -- Combined overdue flag (Requirement C12: strictly > deadline calendar days)
        IF v_age > v_sla_deadline THEN
            INSERT INTO public.admin_review_flag (
                flag_type, subject_type, subject_id, source_rule, assigned_role, details
            ) VALUES (
                'APPLICATION_OVERDUE',
                'driver_application',
                v_aff.affiliation_id::TEXT,
                'Rule 3.7',
                'lgu_admin',
                jsonb_build_object(
                    'driver_name', v_aff.driver_name,
                    'affiliation_id', v_aff.affiliation_id,
                    'age_days', v_age,
                    'stage', CASE WHEN v_aff.toda_endorsement_status = 'Submitted' THEN 'Stage 1 (TODA)' ELSE 'Stage 2 (LGU)' END
                )
            ) ON CONFLICT (subject_type, subject_id, flag_type) WHERE status IN ('Open', 'Under Review') DO NOTHING;

            v_overdue_count := v_overdue_count + 1;
        END IF;

        -- Stage 1 Reminder to TODA Admin (>= reminder days)
        IF v_aff.toda_endorsement_status = 'Submitted' AND v_age >= v_sla_reminder THEN
            INSERT INTO public.notification (
                recipient_id,
                subject_id,
                driver_id,
                title,
                message,
                notification_type,
                threshold_days,
                sent_at
            ) VALUES (
                'toda_' || v_aff.toda_id::TEXT,
                v_aff.affiliation_id::TEXT,
                v_aff.driver_id,
                'SLA Reminder: Driver Application Pending Review',
                'Ang aplikasyon para kay ' || v_aff.driver_name || ' ay ' || v_age || ' araw nang naghihintay ng TODA endorsement.',
                'SLA_REMINDER_STAGE1',
                v_sla_reminder,
                CURRENT_TIMESTAMP
            ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;

            v_reminders_count := v_reminders_count + 1;
        END IF;

        -- Stage 2 Reminder to LGU Admin (>= reminder days)
        IF v_aff.toda_endorsement_status = 'Endorsed' AND v_aff.lgu_verification_status = 'Pending' AND v_aff.toda_endorsed_at IS NOT NULL THEN
            v_stage_age := public.calculate_review_age_days(v_aff.toda_endorsed_at, v_aff.resubmitted_at);
            IF v_stage_age >= v_sla_reminder THEN
                INSERT INTO public.notification (
                    recipient_id,
                    subject_id,
                    driver_id,
                    title,
                    message,
                    notification_type,
                    threshold_days,
                    sent_at
                ) VALUES (
                    'lgu_admin',
                    v_aff.affiliation_id::TEXT,
                    v_aff.driver_id,
                    'SLA Reminder: Driver Verification Pending LGU Final Review',
                    'Ang aplikasyon para kay ' || v_aff.driver_name || ' ay ' || v_stage_age || ' araw nang naghihintay ng LGU verification matapos ma-endorso.',
                    'SLA_REMINDER_STAGE2',
                    v_sla_reminder,
                    CURRENT_TIMESTAMP
                ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;

                v_reminders_count := v_reminders_count + 1;
            END IF;
        END IF;
    END LOOP;

    -- 2. Advance Expiry Reminders with threshold crossed and not yet sent logic (Item A5, Rule 24.4)
    -- Driver License and MTOP Expiry Reminders
    FOR v_driver IN
        SELECT driver_id, toda_id, full_name, license_expiry, mtop_expiry
        FROM public.driver
        WHERE account_status IN ('Verified', 'Pending Verification')
    LOOP
        -- Check license expiry
        IF v_driver.license_expiry IS NOT NULL THEN
            v_lic_days := (v_driver.license_expiry - v_now_manila);
            FOREACH v_t IN ARRAY v_thresholds
            LOOP
                IF v_lic_days <= v_t AND v_lic_days > 0 THEN
                    -- Notify driver
                    INSERT INTO public.notification (
                        recipient_id, subject_id, driver_id, title, message, notification_type, threshold_days, sent_at
                    ) VALUES (
                        v_driver.driver_id::TEXT,
                        v_driver.driver_id::TEXT,
                        v_driver.driver_id,
                        'Paalala: Malapit nang Mapaso ang Driver''s License',
                        'Ang iyong Driver''s License ay mapapaso sa loob ng ' || v_lic_days || ' araw (' || v_driver.license_expiry::TEXT || '). Mangyaring mag-sumite ng renewal bago ang petsang ito upang maiwasan ang service restriction.',
                        'LICENSE_EXPIRY_REMINDER',
                        v_t,
                        CURRENT_TIMESTAMP
                    ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;

                    -- Notify TODA Admin
                    IF v_driver.toda_id IS NOT NULL THEN
                        INSERT INTO public.notification (
                            recipient_id, subject_id, driver_id, title, message, notification_type, threshold_days, sent_at
                        ) VALUES (
                            'toda_' || v_driver.toda_id::TEXT,
                            v_driver.driver_id::TEXT,
                            v_driver.driver_id,
                            'Driver License Expiry Warning: ' || v_driver.full_name,
                            'Ang Driver''s License ni ' || v_driver.full_name || ' ay mapapaso sa loob ng ' || v_lic_days || ' araw.',
                            'DRIVER_LICENSE_EXPIRY_WARNING',
                            v_t,
                            CURRENT_TIMESTAMP
                        ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;
                    END IF;

                    v_reminders_count := v_reminders_count + 1;
                END IF;
            END LOOP;
        END IF;

        -- Check MTOP expiry
        IF v_driver.mtop_expiry IS NOT NULL THEN
            v_mtop_days := (v_driver.mtop_expiry - v_now_manila);
            FOREACH v_t IN ARRAY v_thresholds
            LOOP
                IF v_mtop_days <= v_t AND v_mtop_days > 0 THEN
                    -- Notify driver
                    INSERT INTO public.notification (
                        recipient_id, subject_id, driver_id, title, message, notification_type, threshold_days, sent_at
                    ) VALUES (
                        v_driver.driver_id::TEXT,
                        v_driver.driver_id::TEXT,
                        v_driver.driver_id,
                        'Paalala: Malapit nang Mapaso ang MTOP Franchise',
                        'Ang iyong MTOP Franchise Permit ay mapapaso sa loob ng ' || v_mtop_days || ' araw (' || v_driver.mtop_expiry::TEXT || ').',
                        'MTOP_EXPIRY_REMINDER',
                        v_t,
                        CURRENT_TIMESTAMP
                    ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;

                    -- Notify TODA Admin
                    IF v_driver.toda_id IS NOT NULL THEN
                        INSERT INTO public.notification (
                            recipient_id, subject_id, driver_id, title, message, notification_type, threshold_days, sent_at
                        ) VALUES (
                            'toda_' || v_driver.toda_id::TEXT,
                            v_driver.driver_id::TEXT,
                            v_driver.driver_id,
                            'Driver MTOP Expiry Warning: ' || v_driver.full_name,
                            'Ang MTOP franchise permit ni ' || v_driver.full_name || ' ay mapapaso sa loob ng ' || v_mtop_days || ' araw.',
                            'DRIVER_MTOP_EXPIRY_WARNING',
                            v_t,
                            CURRENT_TIMESTAMP
                        ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;
                    END IF;

                    v_reminders_count := v_reminders_count + 1;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    -- TODA Accreditation Certificate Expiry Reminders
    FOR v_toda IN
        SELECT toda_id, toda_name, certificate_expiry
        FROM public.toda
        WHERE toda_status = 'Active' AND certificate_expiry IS NOT NULL
    LOOP
        v_toda_days := ((v_toda.certificate_expiry AT TIME ZONE 'Asia/Manila')::DATE - v_now_manila);
        FOREACH v_t IN ARRAY v_thresholds
        LOOP
            IF v_toda_days <= v_t AND v_toda_days > 0 THEN
                -- Notify TODA Admin
                INSERT INTO public.notification (
                    recipient_id, subject_id, title, message, notification_type, threshold_days, sent_at
                ) VALUES (
                    'toda_' || v_toda.toda_id::TEXT,
                    v_toda.toda_id::TEXT,
                    'Babala: Malapit nang Mapaso ang Akreditasyon ng TODA',
                    'Ang Certificate of Affiliation / Akreditasyon ng ' || v_toda.toda_name || ' ay mapapaso sa loob ng ' || v_toda_days || ' araw. Mag-renew sa LGU upang maiwasan ang suspension ng mga kaanib na drayber.',
                    'TODA_EXPIRY_REMINDER',
                    v_t,
                    CURRENT_TIMESTAMP
                ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;

                -- Notify LGU Admin
                INSERT INTO public.notification (
                    recipient_id, subject_id, title, message, notification_type, threshold_days, sent_at
                ) VALUES (
                    'lgu_admin',
                    v_toda.toda_id::TEXT,
                    'TODA Accreditation Expiry Notice: ' || v_toda.toda_name,
                    'Ang akreditasyon para sa ' || v_toda.toda_name || ' ay mapapaso sa loob ng ' || v_toda_days || ' araw.',
                    'TODA_EXPIRY_REMINDER',
                    v_t,
                    CURRENT_TIMESTAMP
                ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;

                v_reminders_count := v_reminders_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    -- 3. Documentary Restriction Cascade (Rule 24.2, 24.3, Item A5, PI-13)
    -- Requirement B8: Do not force Offline while Busy (active trip). Apply when trip finishes.
    FOR v_driver IN
        SELECT driver_id, toda_id, availability_status, full_name
        FROM public.driver
        WHERE account_status = 'Verified' 
          AND availability_status = 'Available'
    LOOP
        v_restr := public.is_driver_documentarily_restricted(v_driver.driver_id);
        IF (v_restr->>'is_restricted')::BOOLEAN = TRUE THEN
            PERFORM set_config('sakay.internal_context', 'true', true);

            UPDATE public.driver
            SET availability_status = 'Offline'
            WHERE driver_id = v_driver.driver_id;

            -- Audit log with actor system and action DRIVER_FORCED_OFFLINE (Item A5)
            INSERT INTO public.audit_log (
                action_type, target_id, actor_role, details, performed_at
            ) VALUES (
                'DRIVER_FORCED_OFFLINE',
                v_driver.driver_id::TEXT,
                'system',
                'Driver ' || v_driver.full_name || ' forced Offline due to expired credentials or missing accreditation: ' || (v_restr->>'reasons'),
                CURRENT_TIMESTAMP
            );

            -- Notify Driver (Item A5)
            INSERT INTO public.notification (
                recipient_id, subject_id, driver_id, title, message, notification_type, threshold_days, sent_at
            ) VALUES (
                v_driver.driver_id::TEXT,
                v_driver.driver_id::TEXT,
                v_driver.driver_id,
                'Pansamantalang Hindi Maaaring Mag-Online (Documentary Restriction)',
                'Hindi ka maaaring mag-Online dahil paso o kulang ang iyong dokumento: ' || (v_restr->>'reasons'),
                'DRIVER_DOCUMENTARY_RESTRICTION',
                0,
                CURRENT_TIMESTAMP
            ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;

            -- Notify TODA Admin (Item A5)
            IF v_driver.toda_id IS NOT NULL THEN
                INSERT INTO public.notification (
                    recipient_id, subject_id, driver_id, title, message, notification_type, threshold_days, sent_at
                ) VALUES (
                    'toda_' || v_driver.toda_id::TEXT,
                    v_driver.driver_id::TEXT,
                    v_driver.driver_id,
                    'Driver Forced Offline: ' || v_driver.full_name,
                    'Ang drayber na si ' || v_driver.full_name || ' ay awtomatikong inilagay sa Offline dahil sa expired credentials o accreditation: ' || (v_restr->>'reasons'),
                    'DRIVER_RESTRICTED_TODA_NOTICE',
                    0,
                    CURRENT_TIMESTAMP
                ) ON CONFLICT (recipient_id, notification_type, subject_id, threshold_days) DO NOTHING;
            END IF;

            v_restricted_count := v_restricted_count + 1;
        END IF;
    END LOOP;

    -- 4. Check TODA Excess Incidents (Rule 2.5)
    PERFORM public.check_toda_excess_incidents();

    RETURN jsonb_build_object(
        'success', true,
        'overdue_flags_created', v_overdue_count,
        'reminders_sent', v_reminders_count,
        'drivers_restricted', v_restricted_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke execute on sensitive administrative functions (Requirement A4)
REVOKE EXECUTE ON FUNCTION public.run_scheduled_sla_and_expiry_cascade() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_sla_and_expiry_cascade() TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_driver_documentarily_restricted(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_driver_documentarily_restricted(UUID) TO authenticated, service_role;

-- Grant permissions on RPCs to authenticated
GRANT EXECUTE ON FUNCTION public.approve_toda_accreditation(UUID, TEXT, TIMESTAMPTZ, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.endorse_driver_affiliation(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_driver_affiliation(UUID, TEXT, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.return_driver_affiliation(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_driver_affiliation(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resubmit_driver_application(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_driver_renewal(UUID, DATE, DATE, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_driver_renewal(UUID, BOOLEAN, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_driver_toda_affiliation(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.select_active_driver_affiliation(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.permanently_disqualify_driver(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.allow_driver_reapplication(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_terminal_relocation(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_terminal_relocation(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_terminal_relocation(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_pilot_service_area(UUID, DOUBLE PRECISION) TO authenticated, service_role;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
