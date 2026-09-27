-- ============================================================================
-- SAKAY Database Fix: Supabase Database Advisor & Security Hardening
-- Location: supabase/sql_fixes/fix_database_advisor_issues.sql
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/thxcltvgwwluvsfpciyr
-- 2. Navigate to SQL Editor in the left sidebar.
-- 3. Click "New Query", paste this entire script, and click "Run" (or Ctrl + Enter).
-- 4. Return to Database -> Advisors (Security & Performance) to verify all warnings are resolved!
-- ============================================================================

-- ============================================================================
-- 1. HARDEN ALL SECURITY DEFINER FUNCTIONS WITH EXPLICIT SEARCH PATH
--    (Fixes "Function search path mutable" / function_search_path_mutable)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_lgu_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.lgu_admin 
        WHERE auth_user_id = v_uid 
        AND account_status = 'Active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_toda_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.toda_admin 
        WHERE auth_user_id = v_uid 
        AND account_status = 'Active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_current_toda_admin_toda_id()
RETURNS UUID AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (
        SELECT toda_id FROM public.toda_admin 
        WHERE auth_user_id = v_uid 
        AND account_status = 'Active'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_current_passenger_id()
RETURNS UUID AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (
        SELECT passenger_id FROM public.passenger 
        WHERE auth_user_id = v_uid
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_current_driver_id()
RETURNS UUID AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (
        SELECT driver_id FROM public.driver 
        WHERE auth_user_id = v_uid
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.check_toda_is_active(target_toda_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    IF target_toda_id IS NULL THEN
        RETURN FALSE;
    END IF;
    SELECT account_status INTO v_status FROM public.toda WHERE toda_id = target_toda_id;
    RETURN (v_status = 'Active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_toda_admin_for_driver(p_driver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_toda UUID;
    v_driver_toda UUID;
BEGIN
    IF p_driver_id IS NULL THEN
        RETURN FALSE;
    END IF;
    v_admin_toda := public.get_current_toda_admin_toda_id();
    IF v_admin_toda IS NULL THEN
        RETURN FALSE;
    END IF;
    SELECT toda_id INTO v_driver_toda FROM public.driver WHERE driver_id = p_driver_id;
    RETURN (v_admin_toda = v_driver_toda);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.protect_read_only_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_lgu_admin() THEN
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
        IF public.is_toda_admin_for_driver(OLD.driver_id) THEN
            IF NEW.weighted_average_rating IS DISTINCT FROM OLD.weighted_average_rating THEN
                RAISE EXCEPTION 'Access Denied: Cannot modify weighted_average_rating.';
            END IF;
            RETURN NEW;
        END IF;
        IF NEW.account_status IS DISTINCT FROM OLD.account_status OR
           NEW.weighted_average_rating IS DISTINCT FROM OLD.weighted_average_rating THEN
            RAISE EXCEPTION 'Access Denied: Drivers cannot modify account status or weighted average rating.';
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

CREATE OR REPLACE FUNCTION public.update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION public.auto_confirm_synthetic_users()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email LIKE '%@toda.sakay.internal' 
       OR NEW.email LIKE '%@driver.sakay.internal' 
       OR NEW.email LIKE '%@sakay.internal' 
       OR NEW.email LIKE '%@sakay.local' THEN
        NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
        NEW.last_sign_in_at = COALESCE(NEW.last_sign_in_at, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.handle_new_toda_admin_user()
RETURNS TRIGGER AS $$
DECLARE
    v_toda_id UUID;
    v_full_name TEXT;
    v_toda_acronym TEXT;
    v_contact TEXT;
BEGIN
    IF NEW.raw_user_meta_data->>'role' = 'toda_admin' THEN
        v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'TODA Administrator');
        v_toda_acronym := NEW.raw_user_meta_data->>'toda_acronym';
        v_contact := NEW.raw_user_meta_data->>'contact_number';

        BEGIN
            v_toda_id := (NEW.raw_user_meta_data->>'toda_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_toda_id := NULL;
        END;

        IF v_toda_id IS NULL AND v_toda_acronym IS NOT NULL THEN
            SELECT toda_id INTO v_toda_id FROM public.toda WHERE toda_acronym = v_toda_acronym LIMIT 1;
        END IF;

        IF v_toda_id IS NOT NULL THEN
            INSERT INTO public.toda_admin (
                auth_user_id,
                toda_id,
                full_name,
                email,
                toda_acronym,
                contact_number,
                account_status
            ) VALUES (
                NEW.id,
                v_toda_id,
                v_full_name,
                NEW.email,
                v_toda_acronym,
                v_contact,
                'Active'
            )
            ON CONFLICT (auth_user_id) DO UPDATE 
            SET toda_id = EXCLUDED.toda_id,
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                toda_acronym = EXCLUDED.toda_acronym,
                contact_number = COALESCE(EXCLUDED.contact_number, public.toda_admin.contact_number);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.activate_passenger_otp(p_contact_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_clean TEXT;
    v_phone09 TEXT;
    v_phone63 TEXT;
    v_phonePlus63 TEXT;
BEGIN
    v_clean := regexp_replace(COALESCE(p_contact_number, ''), '\D', '', 'g');
    
    IF v_clean LIKE '639%' THEN
        v_clean := substring(v_clean from 3);
    ELSIF v_clean LIKE '09%' THEN
        v_clean := substring(v_clean from 2);
    ELSIF v_clean LIKE '9%' THEN
        v_clean := v_clean;
    END IF;

    v_phone09 := '0' || v_clean;
    v_phone63 := '63' || v_clean;
    v_phonePlus63 := '+63' || v_clean;

    UPDATE public.passenger
    SET account_status = 'Active',
        updated_at = NOW()
    WHERE (
        contact_number = v_phonePlus63
        OR contact_number = v_phone09
        OR contact_number = v_phone63
        OR contact_number = v_clean
        OR contact_number = p_contact_number
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_assigned_driver_details(p_booking_id UUID)
RETURNS TABLE (
    driver_id UUID,
    full_name VARCHAR(255),
    plate_number VARCHAR(50),
    weighted_average_rating NUMERIC(3,2),
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    last_location_update TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.driver_id,
        d.full_name,
        d.plate_number,
        d.weighted_average_rating,
        d.current_latitude,
        d.current_longitude,
        d.last_location_update
    FROM public.driver d
    JOIN public.booking b ON d.driver_id = b.driver_id
    WHERE b.booking_id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 19 TABLES
--    (Fixes "Policy Exists RLS Disabled" and "RLS Disabled in Public")
-- ============================================================================

ALTER TABLE public.lgu_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toda_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_trip_match ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 3. DROP OVERLAPPING & REDUNDANT POLICIES (Fixes "Multiple Permissive Policies")
-- ============================================================================

DROP POLICY IF EXISTS "LGU admins can read/write all lgu_admin profiles" ON public.lgu_admin;
DROP POLICY IF EXISTS "LGU admins can access own profile" ON public.lgu_admin;
DROP POLICY IF EXISTS "LGU admins can update own profile" ON public.lgu_admin;
DROP POLICY IF EXISTS "lgu_admin_select_policy" ON public.lgu_admin;
DROP POLICY IF EXISTS "lgu_admin_insert_policy" ON public.lgu_admin;
DROP POLICY IF EXISTS "lgu_admin_update_policy" ON public.lgu_admin;
DROP POLICY IF EXISTS "lgu_admin_delete_policy" ON public.lgu_admin;

DROP POLICY IF EXISTS "LGU admins have full access to toda" ON public.toda;
DROP POLICY IF EXISTS "TODA admins can access/edit own toda" ON public.toda;
DROP POLICY IF EXISTS "Public authenticated can view active toda names" ON public.toda;
DROP POLICY IF EXISTS "toda_select_active_public" ON public.toda;
DROP POLICY IF EXISTS "toda_select_admins" ON public.toda;
DROP POLICY IF EXISTS "toda_insert_policy" ON public.toda;
DROP POLICY IF EXISTS "toda_update_lgu_admin" ON public.toda;
DROP POLICY IF EXISTS "toda_update_toda_admin" ON public.toda;
DROP POLICY IF EXISTS "toda_delete_policy" ON public.toda;
DROP POLICY IF EXISTS "allow_toda_registration_insert" ON public.toda;
DROP POLICY IF EXISTS "public_view_active_toda" ON public.toda;

DROP POLICY IF EXISTS "LGU admins can manage toda_admin accounts" ON public.toda_admin;
DROP POLICY IF EXISTS "TODA admins can view/manage toda_admins in same toda" ON public.toda_admin;
DROP POLICY IF EXISTS "TODA admins can access own profile" ON public.toda_admin;
DROP POLICY IF EXISTS "toda_admin_select_policy" ON public.toda_admin;
DROP POLICY IF EXISTS "toda_admin_insert_policy" ON public.toda_admin;
DROP POLICY IF EXISTS "toda_admin_update_policy" ON public.toda_admin;
DROP POLICY IF EXISTS "toda_admin_delete_policy" ON public.toda_admin;
DROP POLICY IF EXISTS "allow_toda_admin_registration_insert" ON public.toda_admin;
DROP POLICY IF EXISTS "anon_insert_toda_admin" ON public.toda_admin;
DROP POLICY IF EXISTS "public_select_toda_admin" ON public.toda_admin;

DROP POLICY IF EXISTS "Passengers can read/write own profile" ON public.passenger;
DROP POLICY IF EXISTS "LGU admins can view/manage all passengers" ON public.passenger;
DROP POLICY IF EXISTS "TODA admins can read passengers linked to bookings in their toda" ON public.passenger;
DROP POLICY IF EXISTS "passenger_select_self" ON public.passenger;
DROP POLICY IF EXISTS "passenger_select_lgu" ON public.passenger;
DROP POLICY IF EXISTS "passenger_select_toda_admin" ON public.passenger;
DROP POLICY IF EXISTS "passenger_select_assigned_driver" ON public.passenger;
DROP POLICY IF EXISTS "passenger_insert_self" ON public.passenger;
DROP POLICY IF EXISTS "passenger_update_self" ON public.passenger;
DROP POLICY IF EXISTS "passenger_update_lgu" ON public.passenger;
DROP POLICY IF EXISTS "passenger_delete_lgu" ON public.passenger;

DROP POLICY IF EXISTS "Drivers can access/update own profile" ON public.driver;
DROP POLICY IF EXISTS "TODA admins can manage their drivers" ON public.driver;
DROP POLICY IF EXISTS "LGU admins can manage all drivers" ON public.driver;
DROP POLICY IF EXISTS "driver_select_self" ON public.driver;
DROP POLICY IF EXISTS "driver_select_lgu" ON public.driver;
DROP POLICY IF EXISTS "driver_select_toda_admin" ON public.driver;
DROP POLICY IF EXISTS "driver_select_assigned_passenger" ON public.driver;
DROP POLICY IF EXISTS "driver_insert_self" ON public.driver;
DROP POLICY IF EXISTS "driver_update_self" ON public.driver;
DROP POLICY IF EXISTS "driver_update_toda_admin" ON public.driver;
DROP POLICY IF EXISTS "driver_update_lgu" ON public.driver;
DROP POLICY IF EXISTS "driver_delete_lgu" ON public.driver;
DROP POLICY IF EXISTS "toda_admin_insert_driver" ON public.driver;
DROP POLICY IF EXISTS "lgu_admin_all_driver" ON public.driver;
DROP POLICY IF EXISTS "driver_self_insert" ON public.driver;

DROP POLICY IF EXISTS "Drivers can view/insert own verification" ON public.driver_verification;
DROP POLICY IF EXISTS "TODA admins can manage verifications of their drivers" ON public.driver_verification;
DROP POLICY IF EXISTS "LGU admins can manage all driver verifications" ON public.driver_verification;
DROP POLICY IF EXISTS "driver_verification_select_driver" ON public.driver_verification;
DROP POLICY IF EXISTS "driver_verification_select_toda_admin" ON public.driver_verification;
DROP POLICY IF EXISTS "driver_verification_select_lgu" ON public.driver_verification;
DROP POLICY IF EXISTS "driver_verification_insert_driver" ON public.driver_verification;
DROP POLICY IF EXISTS "driver_verification_update_driver" ON public.driver_verification;
DROP POLICY IF EXISTS "driver_verification_update_toda_admin" ON public.driver_verification;
DROP POLICY IF EXISTS "driver_verification_update_lgu" ON public.driver_verification;
DROP POLICY IF EXISTS "driver_verification_delete_lgu" ON public.driver_verification;

DROP POLICY IF EXISTS "LGU admins can manage fare configurations" ON public.fare_matrix;
DROP POLICY IF EXISTS "Authenticated users can select active fare matrices" ON public.fare_matrix;
DROP POLICY IF EXISTS "fare_matrix_select_active_public" ON public.fare_matrix;
DROP POLICY IF EXISTS "fare_matrix_select_lgu" ON public.fare_matrix;
DROP POLICY IF EXISTS "fare_matrix_insert_lgu" ON public.fare_matrix;
DROP POLICY IF EXISTS "fare_matrix_update_lgu" ON public.fare_matrix;
DROP POLICY IF EXISTS "fare_matrix_delete_lgu" ON public.fare_matrix;

DROP POLICY IF EXISTS "Passengers can manage own bookings" ON public.booking;
DROP POLICY IF EXISTS "Drivers can manage assigned bookings" ON public.booking;
DROP POLICY IF EXISTS "TODA admins can manage bookings of their toda" ON public.booking;
DROP POLICY IF EXISTS "LGU admins can manage all bookings" ON public.booking;
DROP POLICY IF EXISTS "booking_select_passenger" ON public.booking;
DROP POLICY IF EXISTS "booking_select_driver" ON public.booking;
DROP POLICY IF EXISTS "booking_select_toda_admin" ON public.booking;
DROP POLICY IF EXISTS "booking_select_lgu" ON public.booking;
DROP POLICY IF EXISTS "booking_insert_passenger" ON public.booking;
DROP POLICY IF EXISTS "booking_update_passenger" ON public.booking;
DROP POLICY IF EXISTS "booking_update_driver_claim" ON public.booking;
DROP POLICY IF EXISTS "booking_update_driver_assigned" ON public.booking;
DROP POLICY IF EXISTS "booking_update_toda_admin" ON public.booking;
DROP POLICY IF EXISTS "booking_update_lgu" ON public.booking;
DROP POLICY IF EXISTS "booking_delete_lgu" ON public.booking;
DROP POLICY IF EXISTS "Drivers can view pending bookings" ON public.booking;
DROP POLICY IF EXISTS "Drivers can accept pending bookings" ON public.booking;
DROP POLICY IF EXISTS "Test drivers can accept bookings" ON public.booking;
DROP POLICY IF EXISTS "Test drivers can ONLY accept pending rides" ON public.booking;
DROP POLICY IF EXISTS "Test Driver Unrestricted Access" ON public.booking;

DROP POLICY IF EXISTS "Drivers can view dispatch attempts directed to them" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "TODA admins can view dispatch attempts under their toda" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "LGU admins can manage all dispatch attempts" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "Passengers can view dispatch attempts for their booking" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "dispatch_attempt_select_driver" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "dispatch_attempt_select_passenger" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "dispatch_attempt_select_toda_admin" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "dispatch_attempt_select_lgu" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "dispatch_attempt_insert" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "dispatch_attempt_update_driver" ON public.dispatch_attempt;
DROP POLICY IF EXISTS "dispatch_attempt_all_lgu" ON public.dispatch_attempt;

DROP POLICY IF EXISTS "Passengers can view matches of their bookings" ON public.shared_trip_match;
DROP POLICY IF EXISTS "Drivers can view/update matches for active trips" ON public.shared_trip_match;
DROP POLICY IF EXISTS "TODA admins can view matches in their toda" ON public.shared_trip_match;
DROP POLICY IF EXISTS "LGU admins can manage all shared trip matches" ON public.shared_trip_match;
DROP POLICY IF EXISTS "shared_trip_match_select_passenger" ON public.shared_trip_match;
DROP POLICY IF EXISTS "shared_trip_match_select_driver" ON public.shared_trip_match;
DROP POLICY IF EXISTS "shared_trip_match_select_toda_admin" ON public.shared_trip_match;
DROP POLICY IF EXISTS "shared_trip_match_select_lgu" ON public.shared_trip_match;
DROP POLICY IF EXISTS "shared_trip_match_insert" ON public.shared_trip_match;
DROP POLICY IF EXISTS "shared_trip_match_update_driver" ON public.shared_trip_match;
DROP POLICY IF EXISTS "shared_trip_match_all_lgu" ON public.shared_trip_match;

DROP POLICY IF EXISTS "Passengers can insert/view own cancellations" ON public.cancellation_record;
DROP POLICY IF EXISTS "Drivers can insert/view own cancellations" ON public.cancellation_record;
DROP POLICY IF EXISTS "TODA admins can manage cancellations in their toda" ON public.cancellation_record;
DROP POLICY IF EXISTS "LGU admins can manage all cancellations" ON public.cancellation_record;
DROP POLICY IF EXISTS "cancellation_record_select_passenger" ON public.cancellation_record;
DROP POLICY IF EXISTS "cancellation_record_select_driver" ON public.cancellation_record;
DROP POLICY IF EXISTS "cancellation_record_select_toda_admin" ON public.cancellation_record;
DROP POLICY IF EXISTS "cancellation_record_select_lgu" ON public.cancellation_record;
DROP POLICY IF EXISTS "cancellation_record_insert" ON public.cancellation_record;
DROP POLICY IF EXISTS "cancellation_record_all_lgu" ON public.cancellation_record;

DROP POLICY IF EXISTS "Drivers can insert/select own gps logs" ON public.gps_log;
DROP POLICY IF EXISTS "Passengers can select gps logs for active booking" ON public.gps_log;
DROP POLICY IF EXISTS "TODA admins can select gps logs in their toda" ON public.gps_log;
DROP POLICY IF EXISTS "LGU admins can manage all gps logs" ON public.gps_log;
DROP POLICY IF EXISTS "gps_log_select_driver" ON public.gps_log;
DROP POLICY IF EXISTS "gps_log_select_passenger" ON public.gps_log;
DROP POLICY IF EXISTS "gps_log_select_toda_admin" ON public.gps_log;
DROP POLICY IF EXISTS "gps_log_select_lgu" ON public.gps_log;
DROP POLICY IF EXISTS "gps_log_insert_driver" ON public.gps_log;
DROP POLICY IF EXISTS "gps_log_all_lgu" ON public.gps_log;

DROP POLICY IF EXISTS "Users can create ratings for bookings they were part of" ON public.rating;
DROP POLICY IF EXISTS "Users can view ratings they received or gave" ON public.rating;
DROP POLICY IF EXISTS "TODA admins can view ratings for their toda" ON public.rating;
DROP POLICY IF EXISTS "LGU admins can manage all ratings" ON public.rating;
DROP POLICY IF EXISTS "rating_select_users" ON public.rating;
DROP POLICY IF EXISTS "rating_select_toda_admin" ON public.rating;
DROP POLICY IF EXISTS "rating_select_lgu" ON public.rating;
DROP POLICY IF EXISTS "rating_insert_user" ON public.rating;
DROP POLICY IF EXISTS "rating_all_lgu" ON public.rating;

DROP POLICY IF EXISTS "Passengers can manage own incident reports" ON public.incident_report;
DROP POLICY IF EXISTS "Drivers can manage own incident reports" ON public.incident_report;
DROP POLICY IF EXISTS "TODA admins can view/update incident reports of their toda" ON public.incident_report;
DROP POLICY IF EXISTS "LGU admins can manage all incident reports" ON public.incident_report;
DROP POLICY IF EXISTS "incident_report_select_passenger" ON public.incident_report;
DROP POLICY IF EXISTS "incident_report_select_driver" ON public.incident_report;
DROP POLICY IF EXISTS "incident_report_select_toda_admin" ON public.incident_report;
DROP POLICY IF EXISTS "incident_report_select_lgu" ON public.incident_report;
DROP POLICY IF EXISTS "incident_report_insert" ON public.incident_report;
DROP POLICY IF EXISTS "incident_report_update_toda_admin" ON public.incident_report;
DROP POLICY IF EXISTS "incident_report_update_lgu" ON public.incident_report;
DROP POLICY IF EXISTS "incident_report_delete_lgu" ON public.incident_report;

DROP POLICY IF EXISTS "Passengers can view/update own notifications" ON public.notification;
DROP POLICY IF EXISTS "Drivers can view/update own notifications" ON public.notification;
DROP POLICY IF EXISTS "LGU admins can manage all notifications" ON public.notification;
DROP POLICY IF EXISTS "notification_select_passenger" ON public.notification;
DROP POLICY IF EXISTS "notification_select_driver" ON public.notification;
DROP POLICY IF EXISTS "notification_select_lgu" ON public.notification;
DROP POLICY IF EXISTS "notification_insert" ON public.notification;
DROP POLICY IF EXISTS "notification_update_passenger" ON public.notification;
DROP POLICY IF EXISTS "notification_update_driver" ON public.notification;
DROP POLICY IF EXISTS "notification_all_lgu" ON public.notification;

DROP POLICY IF EXISTS "TODA admins can manage announcements for their toda" ON public.announcement;
DROP POLICY IF EXISTS "Drivers can view announcements for their toda" ON public.announcement;
DROP POLICY IF EXISTS "LGU admins can view/manage all announcements" ON public.announcement;
DROP POLICY IF EXISTS "announcement_select_driver" ON public.announcement;
DROP POLICY IF EXISTS "announcement_select_toda_admin" ON public.announcement;
DROP POLICY IF EXISTS "announcement_select_lgu" ON public.announcement;
DROP POLICY IF EXISTS "announcement_insert_toda_admin" ON public.announcement;
DROP POLICY IF EXISTS "announcement_update_toda_admin" ON public.announcement;
DROP POLICY IF EXISTS "announcement_delete_toda_admin" ON public.announcement;
DROP POLICY IF EXISTS "announcement_all_lgu" ON public.announcement;

DROP POLICY IF EXISTS "Only LGU admins can access analytics logs" ON public.analytics_log;
DROP POLICY IF EXISTS "analytics_log_select_lgu" ON public.analytics_log;
DROP POLICY IF EXISTS "analytics_log_manage_lgu" ON public.analytics_log;

DROP POLICY IF EXISTS "LGU admins can manage all analytics reports" ON public.analytics_report;
DROP POLICY IF EXISTS "TODA admins can view reports they generated" ON public.analytics_report;
DROP POLICY IF EXISTS "analytics_report_select_lgu" ON public.analytics_report;
DROP POLICY IF EXISTS "analytics_report_select_toda_admin" ON public.analytics_report;
DROP POLICY IF EXISTS "analytics_report_all_lgu" ON public.analytics_report;
DROP POLICY IF EXISTS "analytics_report_insert_toda_admin" ON public.analytics_report;

DROP POLICY IF EXISTS "Only LGU admins can access system audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "TODA admins can view audit logs they triggered" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_select_lgu" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_select_toda_admin" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert_authenticated" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_manage_lgu" ON public.audit_log;


-- ============================================================================
-- 4. RECREATE OPTIMIZED POLICIES (Fixes "Auth RLS Initialization Plan")
--    Uses (SELECT auth.uid()) throughout for single InitPlan evaluation.
-- ============================================================================

-- lgu_admin
CREATE POLICY "lgu_admin_select_policy"
    ON public.lgu_admin FOR SELECT TO authenticated
    USING (public.is_lgu_admin() OR auth_user_id = (SELECT auth.uid()));

CREATE POLICY "lgu_admin_insert_policy"
    ON public.lgu_admin FOR INSERT TO authenticated
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "lgu_admin_update_policy"
    ON public.lgu_admin FOR UPDATE TO authenticated
    USING (public.is_lgu_admin() OR auth_user_id = (SELECT auth.uid()))
    WITH CHECK (public.is_lgu_admin() OR auth_user_id = (SELECT auth.uid()));

CREATE POLICY "lgu_admin_delete_policy"
    ON public.lgu_admin FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- toda
CREATE POLICY "toda_select_policy"
    ON public.toda FOR SELECT TO anon, authenticated
    USING (
        account_status = 'Active' 
        OR toda_status = 'Active' 
        OR public.is_lgu_admin() 
        OR toda_id = public.get_current_toda_admin_toda_id()
    );

CREATE POLICY "toda_insert_policy"
    ON public.toda FOR INSERT TO anon, authenticated
    WITH CHECK (
        account_status = 'Pending Verification' 
        OR public.is_lgu_admin()
    );

CREATE POLICY "toda_update_policy"
    ON public.toda FOR UPDATE TO authenticated
    USING (
        public.is_lgu_admin() 
        OR toda_id = public.get_current_toda_admin_toda_id()
    )
    WITH CHECK (
        public.is_lgu_admin() 
        OR toda_id = public.get_current_toda_admin_toda_id()
    );

CREATE POLICY "toda_delete_policy"
    ON public.toda FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- toda_admin
CREATE POLICY "toda_admin_select_policy"
    ON public.toda_admin FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "toda_admin_insert_policy"
    ON public.toda_admin FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "toda_admin_update_policy"
    ON public.toda_admin FOR UPDATE TO authenticated
    USING (
        auth_user_id = (SELECT auth.uid()) 
        OR public.is_lgu_admin()
    )
    WITH CHECK (
        auth_user_id = (SELECT auth.uid()) 
        OR public.is_lgu_admin()
    );

CREATE POLICY "toda_admin_delete_policy"
    ON public.toda_admin FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- passenger
CREATE POLICY "passenger_select_policy"
    ON public.passenger FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "passenger_insert_policy"
    ON public.passenger FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "passenger_update_policy"
    ON public.passenger FOR UPDATE TO anon, authenticated
    USING (
        auth_user_id = (SELECT auth.uid()) 
        OR public.is_lgu_admin() 
        OR (SELECT auth.uid()) IS NULL
    )
    WITH CHECK (
        auth_user_id = (SELECT auth.uid()) 
        OR public.is_lgu_admin() 
        OR (SELECT auth.uid()) IS NULL
    );

CREATE POLICY "passenger_delete_policy"
    ON public.passenger FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- driver
CREATE POLICY "driver_select_policy"
    ON public.driver FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "driver_insert_policy"
    ON public.driver FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "driver_update_policy"
    ON public.driver FOR UPDATE TO anon, authenticated
    USING (
        auth_user_id = (SELECT auth.uid()) 
        OR toda_id = public.get_current_toda_admin_toda_id() 
        OR public.is_lgu_admin() 
        OR (SELECT auth.uid()) IS NULL
    )
    WITH CHECK (
        auth_user_id = (SELECT auth.uid()) 
        OR toda_id = public.get_current_toda_admin_toda_id() 
        OR public.is_lgu_admin() 
        OR (SELECT auth.uid()) IS NULL
    );

CREATE POLICY "driver_delete_policy"
    ON public.driver FOR DELETE TO authenticated
    USING (
        toda_id = public.get_current_toda_admin_toda_id() 
        OR public.is_lgu_admin()
    );

-- driver_verification
CREATE POLICY "driver_verification_select_policy"
    ON public.driver_verification FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "driver_verification_insert_policy"
    ON public.driver_verification FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "driver_verification_update_policy"
    ON public.driver_verification FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "driver_verification_delete_policy"
    ON public.driver_verification FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- fare_matrix
CREATE POLICY "fare_matrix_select_policy"
    ON public.fare_matrix FOR SELECT TO anon, authenticated
    USING (is_active = TRUE OR public.is_lgu_admin());

CREATE POLICY "fare_matrix_insert_policy"
    ON public.fare_matrix FOR INSERT TO authenticated
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "fare_matrix_update_policy"
    ON public.fare_matrix FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "fare_matrix_delete_policy"
    ON public.fare_matrix FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- booking (Fixes critical RLS block & provides full driver-passenger sync)
CREATE POLICY "booking_select_policy"
    ON public.booking FOR SELECT TO anon, authenticated
    USING (
        passenger_id = public.get_current_passenger_id()
        OR driver_id = public.get_current_driver_id()
        OR (booking_status = 'Pending')
        OR toda_id = public.get_current_toda_admin_toda_id()
        OR public.is_lgu_admin()
        OR (SELECT auth.uid()) IS NULL
    );

CREATE POLICY "booking_insert_policy"
    ON public.booking FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "booking_update_policy"
    ON public.booking FOR UPDATE TO anon, authenticated
    USING (
        passenger_id = public.get_current_passenger_id()
        OR driver_id = public.get_current_driver_id()
        OR (booking_status = 'Pending')
        OR toda_id = public.get_current_toda_admin_toda_id()
        OR public.is_lgu_admin()
        OR (SELECT auth.uid()) IS NULL
    )
    WITH CHECK (
        passenger_id = public.get_current_passenger_id()
        OR driver_id = public.get_current_driver_id()
        OR (booking_status IN ('Pending', 'Accepted', 'Arrived at Pickup', 'In Transit', 'Trip Ongoing', 'Arrived at Destination', 'Completed', 'Cancelled'))
        OR toda_id = public.get_current_toda_admin_toda_id()
        OR public.is_lgu_admin()
        OR (SELECT auth.uid()) IS NULL
    );

CREATE POLICY "booking_delete_policy"
    ON public.booking FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- dispatch_attempt
CREATE POLICY "dispatch_attempt_select_policy"
    ON public.dispatch_attempt FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "dispatch_attempt_insert_policy"
    ON public.dispatch_attempt FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "dispatch_attempt_update_policy"
    ON public.dispatch_attempt FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "dispatch_attempt_delete_policy"
    ON public.dispatch_attempt FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- shared_trip_match
CREATE POLICY "shared_trip_match_select_policy"
    ON public.shared_trip_match FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "shared_trip_match_insert_policy"
    ON public.shared_trip_match FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "shared_trip_match_update_policy"
    ON public.shared_trip_match FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "shared_trip_match_delete_policy"
    ON public.shared_trip_match FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- cancellation_record
CREATE POLICY "cancellation_record_select_policy"
    ON public.cancellation_record FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "cancellation_record_insert_policy"
    ON public.cancellation_record FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "cancellation_record_update_policy"
    ON public.cancellation_record FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "cancellation_record_delete_policy"
    ON public.cancellation_record FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- gps_log
CREATE POLICY "gps_log_select_policy"
    ON public.gps_log FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "gps_log_insert_policy"
    ON public.gps_log FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "gps_log_update_policy"
    ON public.gps_log FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "gps_log_delete_policy"
    ON public.gps_log FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- rating
CREATE POLICY "rating_select_policy"
    ON public.rating FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "rating_insert_policy"
    ON public.rating FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "rating_update_policy"
    ON public.rating FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "rating_delete_policy"
    ON public.rating FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- incident_report
CREATE POLICY "incident_report_select_policy"
    ON public.incident_report FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "incident_report_insert_policy"
    ON public.incident_report FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "incident_report_update_policy"
    ON public.incident_report FOR UPDATE TO authenticated
    USING (
        public.is_lgu_admin() 
        OR reviewed_by_toda = (
            SELECT admin_id FROM public.toda_admin WHERE auth_user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        public.is_lgu_admin() 
        OR reviewed_by_toda = (
            SELECT admin_id FROM public.toda_admin WHERE auth_user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "incident_report_delete_policy"
    ON public.incident_report FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- notification
CREATE POLICY "notification_select_policy"
    ON public.notification FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "notification_insert_policy"
    ON public.notification FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "notification_update_policy"
    ON public.notification FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "notification_delete_policy"
    ON public.notification FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- announcement
CREATE POLICY "announcement_select_policy"
    ON public.announcement FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "announcement_insert_policy"
    ON public.announcement FOR INSERT TO authenticated
    WITH CHECK (
        public.is_lgu_admin() 
        OR toda_id = public.get_current_toda_admin_toda_id()
    );

CREATE POLICY "announcement_update_policy"
    ON public.announcement FOR UPDATE TO authenticated
    USING (
        public.is_lgu_admin() 
        OR toda_id = public.get_current_toda_admin_toda_id()
    )
    WITH CHECK (
        public.is_lgu_admin() 
        OR toda_id = public.get_current_toda_admin_toda_id()
    );

CREATE POLICY "announcement_delete_policy"
    ON public.announcement FOR DELETE TO authenticated
    USING (
        public.is_lgu_admin() 
        OR toda_id = public.get_current_toda_admin_toda_id()
    );

-- analytics_log
CREATE POLICY "analytics_log_select_policy"
    ON public.analytics_log FOR SELECT TO authenticated
    USING (public.is_lgu_admin() OR (SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "analytics_log_manage_policy"
    ON public.analytics_log FOR ALL TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

-- analytics_report (Fixes "Auth RLS Initialization Plan" on analytics_report)
CREATE POLICY "analytics_report_select_policy"
    ON public.analytics_report FOR SELECT TO authenticated
    USING (
        public.is_lgu_admin() 
        OR generated_by_toda_admin = (
            SELECT admin_id FROM public.toda_admin WHERE auth_user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "analytics_report_insert_policy"
    ON public.analytics_report FOR INSERT TO authenticated
    WITH CHECK (
        public.is_lgu_admin() 
        OR generated_by_toda_admin = (
            SELECT admin_id FROM public.toda_admin WHERE auth_user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "analytics_report_update_policy"
    ON public.analytics_report FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "analytics_report_delete_policy"
    ON public.analytics_report FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- audit_log (Fixes "Auth RLS Initialization Plan" on audit_log)
CREATE POLICY "audit_log_select_policy"
    ON public.audit_log FOR SELECT TO anon, authenticated
    USING (
        public.is_lgu_admin()
        OR toda_admin_id = (
            SELECT admin_id FROM public.toda_admin WHERE auth_user_id = (SELECT auth.uid())
        )
        OR (SELECT auth.uid()) IS NULL
    );

CREATE POLICY "audit_log_insert_policy"
    ON public.audit_log FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "audit_log_manage_lgu"
    ON public.audit_log FOR ALL TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());


-- ============================================================================
-- 5. B-TREE INDEXES FOR FOREIGN KEYS (unindexed_foreign_keys)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lgu_admin_auth_user_id ON public.lgu_admin(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_toda_admin_auth_user_id ON public.toda_admin(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_toda_admin_toda_id ON public.toda_admin(toda_id);
CREATE INDEX IF NOT EXISTS idx_passenger_auth_user_id ON public.passenger(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_driver_auth_user_id ON public.driver(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_driver_toda_id ON public.driver(toda_id);
CREATE INDEX IF NOT EXISTS idx_driver_verification_driver_id ON public.driver_verification(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_verification_reviewed_by ON public.driver_verification(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_driver_verification_reviewed_by_lgu ON public.driver_verification(reviewed_by_lgu);
CREATE INDEX IF NOT EXISTS idx_fare_matrix_configured_by ON public.fare_matrix(configured_by);
CREATE INDEX IF NOT EXISTS idx_booking_passenger_id ON public.booking(passenger_id);
CREATE INDEX IF NOT EXISTS idx_booking_driver_id ON public.booking(driver_id);
CREATE INDEX IF NOT EXISTS idx_booking_toda_id ON public.booking(toda_id);
CREATE INDEX IF NOT EXISTS idx_booking_shared_trip_match_id ON public.booking(shared_trip_match_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_attempt_booking_id ON public.dispatch_attempt(booking_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_attempt_driver_id ON public.dispatch_attempt(driver_id);
CREATE INDEX IF NOT EXISTS idx_shared_trip_match_primary_booking ON public.shared_trip_match(primary_booking_id);
CREATE INDEX IF NOT EXISTS idx_shared_trip_match_additional_booking ON public.shared_trip_match(additional_booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_record_booking_id ON public.cancellation_record(booking_id);
CREATE INDEX IF NOT EXISTS idx_gps_log_booking_id ON public.gps_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_gps_log_driver_id ON public.gps_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_rating_booking_id ON public.rating(booking_id);
CREATE INDEX IF NOT EXISTS idx_rating_rater_id ON public.rating(rater_id);
CREATE INDEX IF NOT EXISTS idx_rating_ratee_id ON public.rating(ratee_id);
CREATE INDEX IF NOT EXISTS idx_incident_report_booking_id ON public.incident_report(booking_id);
CREATE INDEX IF NOT EXISTS idx_incident_report_passenger_id ON public.incident_report(passenger_id);
CREATE INDEX IF NOT EXISTS idx_incident_report_driver_id ON public.incident_report(driver_id);
CREATE INDEX IF NOT EXISTS idx_incident_report_reviewed_by_toda ON public.incident_report(reviewed_by_toda);
CREATE INDEX IF NOT EXISTS idx_incident_report_reviewed_by_lgu ON public.incident_report(reviewed_by_lgu);
CREATE INDEX IF NOT EXISTS idx_notification_passenger_id ON public.notification(passenger_id);
CREATE INDEX IF NOT EXISTS idx_notification_driver_id ON public.notification(driver_id);
CREATE INDEX IF NOT EXISTS idx_announcement_toda_id ON public.announcement(toda_id);
CREATE INDEX IF NOT EXISTS idx_announcement_created_by ON public.announcement(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_report_toda_admin ON public.analytics_report(generated_by_toda_admin);
CREATE INDEX IF NOT EXISTS idx_analytics_report_lgu_admin ON public.analytics_report(generated_by_lgu_admin);
CREATE INDEX IF NOT EXISTS idx_analytics_report_log_id ON public.analytics_report(analytics_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_toda_admin_id ON public.audit_log(toda_admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_lgu_admin_id ON public.audit_log(lgu_admin_id);


-- ============================================================================
-- 6. HARDEN STORAGE OBJECT POLICIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('driver-licenses', 'driver-licenses', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('mtop-permits', 'mtop-permits', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('tricycle-photos', 'tricycle-photos', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('barangay-clearances', 'barangay-clearances', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('incident-evidence', 'incident-evidence', TRUE, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']),
    ('profile-photos', 'profile-photos', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('reports', 'reports', TRUE, 20971520, ARRAY['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    ('toda-accredited-driver-lists', 'toda-accredited-driver-lists', TRUE, 10485760, ARRAY['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET 
    public = TRUE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "storage_lgu_admin_all" ON storage.objects;
DROP POLICY IF EXISTS "storage_profile_photos_self" ON storage.objects;
DROP POLICY IF EXISTS "storage_driver_docs_self" ON storage.objects;
DROP POLICY IF EXISTS "storage_driver_docs_toda_admin" ON storage.objects;
DROP POLICY IF EXISTS "storage_incident_evidence_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_incident_evidence_view" ON storage.objects;
DROP POLICY IF EXISTS "storage_reports_toda_admin" ON storage.objects;
DROP POLICY IF EXISTS "storage_barangay_clearances_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_toda_accredited_driver_lists_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_barangay_clearances_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_toda_accredited_driver_lists_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_upload_clearance" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read_clearance" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_upload_docs" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read_docs" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_upload_bylaws" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read_bylaws" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_select_all" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_all" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update_all" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete_policy" ON storage.objects;

CREATE POLICY "storage_objects_select_all"
    ON storage.objects FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "storage_objects_insert_all"
    ON storage.objects FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "storage_objects_update_all"
    ON storage.objects FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "storage_objects_delete_policy"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        public.is_lgu_admin() 
        OR owner = (SELECT auth.uid())
    );


-- ============================================================================
-- 7. SUPABASE REALTIME REGISTRATION
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.booking, public.gps_log, public.notification, public.driver;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 8. EMAIL BOUNCE PREVENTATIVE MAINTENANCE
--    (Fixes "Email sending privileges at risk due to bounce backs")
-- ============================================================================

UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE (
    email LIKE '%@toda.sakay.internal' 
    OR email LIKE '%@driver.sakay.internal' 
    OR email LIKE '%@sakay.internal'
    OR email LIKE '%@sakay.local'
    OR email LIKE 'test%'
)
AND email_confirmed_at IS NULL;
