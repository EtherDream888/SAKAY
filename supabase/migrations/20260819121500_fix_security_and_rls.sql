-- ============================================================================
-- SAKAY Database Migration: Security Hardening & Row Level Security (RLS) Fix
-- Migration: 20260819121500_fix_security_and_rls.sql
-- Target: Supabase PostgreSQL (Public Schema & Storage Schema)
-- 
-- SUMMARY OF FIXES:
-- 1. Hardens all SECURITY DEFINER helper functions with `SET search_path = public, pg_temp`
--    and ensures RLS bypass behavior without recursive policy locks.
-- 2. Drops existing broken/overly broad FOR ALL policies and replaces them with
--    granular SELECT, INSERT, UPDATE, and DELETE policies per role model.
-- 3. Enables driver trip claiming (driver_id IS NULL -> driver_id = current_driver) on booking.
-- 4. Grants public/anon SELECT access on active fare_matrix and active toda entities.
-- 5. Enables Row Level Security (RLS) on all 19 public schema tables.
-- 6. Adds missing B-Tree performance indexes on 31 foreign key columns.
-- 7. Provisions 7 private Supabase Storage buckets with strict RLS object policies.
-- 8. Registers high-frequency tables in `supabase_realtime` publication.
-- ============================================================================

-- ============================================================================
-- 1. HARDEN SECURITY-DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Utility trigger function for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Helper to check if current user is an active LGU administrator
-- Runs as SECURITY DEFINER with postgres privileges to safely check lgu_admin table without recursive policy evaluation.
CREATE OR REPLACE FUNCTION public.is_lgu_admin()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.lgu_admin 
        WHERE auth_user_id = auth.uid() 
        AND account_status = 'Active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper to get toda_id of current toda_admin
CREATE OR REPLACE FUNCTION public.get_current_toda_admin_toda_id()
RETURNS UUID AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (
        SELECT toda_id FROM public.toda_admin 
        WHERE auth_user_id = auth.uid() 
        AND account_status = 'Active'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper to get passenger_id of current passenger
CREATE OR REPLACE FUNCTION public.get_current_passenger_id()
RETURNS UUID AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (
        SELECT passenger_id FROM public.passenger 
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper to get driver_id of current driver
CREATE OR REPLACE FUNCTION public.get_current_driver_id()
RETURNS UUID AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (
        SELECT driver_id FROM public.driver 
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper to check if toda_admin is matching the driver's toda
CREATE OR REPLACE FUNCTION public.is_toda_admin_for_driver(p_driver_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL OR p_driver_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.driver d
        WHERE d.driver_id = p_driver_id
        AND d.toda_id = public.get_current_toda_admin_toda_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Reusable function to prevent passenger/driver updating read-only columns
CREATE OR REPLACE FUNCTION public.protect_read_only_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- LGU admins have full permission to modify all columns
    IF public.is_lgu_admin() THEN
        RETURN NEW;
    END IF;

    -- Passenger table column protection
    IF TG_TABLE_NAME = 'passenger' THEN
        IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
            RAISE EXCEPTION 'Access Denied: Passengers cannot modify their own account_status.';
        END IF;
    END IF;

    -- Driver table column protection
    IF TG_TABLE_NAME = 'driver' THEN
        -- TODA admins are allowed to update driver status details if linked to their TODA
        IF public.is_toda_admin_for_driver(OLD.driver_id) THEN
            IF NEW.weighted_average_rating IS DISTINCT FROM OLD.weighted_average_rating THEN
                RAISE EXCEPTION 'Access Denied: Cannot modify weighted_average_rating.';
            END IF;
            RETURN NEW;
        END IF;

        -- Regular driver profile updates
        IF NEW.account_status IS DISTINCT FROM OLD.account_status OR
           NEW.weighted_average_rating IS DISTINCT FROM OLD.weighted_average_rating OR
           NEW.toda_id IS DISTINCT FROM OLD.toda_id OR
           NEW.license_number IS DISTINCT FROM OLD.license_number OR
           NEW.license_expiry IS DISTINCT FROM OLD.license_expiry OR
           NEW.franchise_number IS DISTINCT FROM OLD.franchise_number OR
           NEW.plate_number IS DISTINCT FROM OLD.plate_number OR
           NEW.toda_membership_number IS DISTINCT FROM OLD.toda_membership_number THEN
            RAISE EXCEPTION 'Access Denied: Drivers cannot modify status, ratings, toda, license, franchise, or plate details.';
        END IF;
    END IF;

    -- Driver verification table column protection
    IF TG_TABLE_NAME = 'driver_verification' THEN
        IF EXISTS (
            SELECT 1 FROM public.driver d 
            WHERE d.driver_id = OLD.driver_id 
            AND d.toda_id = public.get_current_toda_admin_toda_id()
        ) THEN
            IF NEW.reviewed_by_lgu IS DISTINCT FROM OLD.reviewed_by_lgu THEN
                RAISE EXCEPTION 'Access Denied: TODA admins cannot modify reviewed_by_lgu.';
            END IF;
            RETURN NEW;
        END IF;

        IF NEW.verification_status IS DISTINCT FROM OLD.verification_status OR
           NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR
           NEW.reviewed_by_lgu IS DISTINCT FROM OLD.reviewed_by_lgu THEN
            RAISE EXCEPTION 'Access Denied: Drivers cannot modify verification status or review details.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Drop NOT NULL constraint on contact_number to allow NULL values for email-only signups and prevent unique collisions on empty strings
ALTER TABLE public.passenger ALTER COLUMN contact_number DROP NOT NULL;
ALTER TABLE public.driver ALTER COLUMN contact_number DROP NOT NULL;

-- Convert existing empty strings to NULL to avoid duplicate key conflicts
UPDATE public.passenger SET contact_number = NULL WHERE contact_number = '';
UPDATE public.driver SET contact_number = NULL WHERE contact_number = '';

-- Role-aware trigger on auth.users for passenger, driver, and admin signups
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_contact_number TEXT;
    user_toda_id UUID;
BEGIN
    -- Extract role from metadata (do NOT default to passenger if not specified, e.g. dashboard creations)
    user_role := NEW.raw_user_meta_data->>'role';
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1));
    user_contact_number := NULLIF(COALESCE(NEW.phone, NEW.raw_user_meta_data->>'contact_number', ''), '');
    
    IF user_role = 'passenger' THEN
        INSERT INTO public.passenger (
            auth_user_id,
            full_name,
            contact_number,
            email,
            profile_photo_url,
            date_of_birth,
            residential_address,
            account_status
        ) VALUES (
            NEW.id,
            user_full_name,
            user_contact_number,
            NEW.email,
            NEW.raw_user_meta_data->>'profile_photo_url',
            NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::DATE,
            NEW.raw_user_meta_data->>'residential_address',
            'Pending OTP Verification'
        ) ON CONFLICT (auth_user_id) DO NOTHING;

    ELSIF user_role = 'driver' THEN
        user_toda_id := NULLIF(NEW.raw_user_meta_data->>'toda_id', '')::UUID;
        INSERT INTO public.driver (
            auth_user_id,
            toda_id,
            full_name,
            contact_number,
            email,
            profile_photo_url,
            date_of_birth,
            residential_address,
            toda_membership_number,
            license_number,
            license_expiry,
            franchise_number,
            plate_number,
            assigned_terminal,
            barangay_service_area,
            account_status,
            availability_status
        ) VALUES (
            NEW.id,
            user_toda_id,
            user_full_name,
            user_contact_number,
            NEW.email,
            NEW.raw_user_meta_data->>'profile_photo_url',
            NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::DATE,
            NEW.raw_user_meta_data->>'residential_address',
            NEW.raw_user_meta_data->>'toda_membership_number',
            NEW.raw_user_meta_data->>'license_number',
            NULLIF(NEW.raw_user_meta_data->>'license_expiry', '')::DATE,
            NEW.raw_user_meta_data->>'franchise_number',
            NEW.raw_user_meta_data->>'plate_number',
            NEW.raw_user_meta_data->>'assigned_terminal',
            NEW.raw_user_meta_data->>'barangay_service_area',
            'Pending Verification',
            'Offline'
        ) ON CONFLICT (auth_user_id) DO NOTHING;

    ELSIF user_role = 'lgu_admin' THEN
        INSERT INTO public.lgu_admin (
            auth_user_id,
            full_name,
            email,
            contact_number,
            position,
            account_status
        ) VALUES (
            NEW.id,
            user_full_name,
            NEW.email,
            user_contact_number,
            COALESCE(NEW.raw_user_meta_data->>'position', 'City Transport Officer'),
            'Active'
        ) ON CONFLICT (auth_user_id) DO NOTHING;
    END IF;

    -- If no recognized role is set in raw_user_meta_data (e.g. manual Supabase Dashboard user creation),
    -- allow the auth user creation to succeed without inserting an unwanted passenger row.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger function on auth.users UPDATE to confirm OTP and activate passenger
CREATE OR REPLACE FUNCTION public.handle_user_auth_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.phone_confirmed_at IS NOT NULL AND OLD.phone_confirmed_at IS NULL THEN
        UPDATE public.passenger
        SET account_status = 'Active'
        WHERE auth_user_id = NEW.id
        AND account_status = 'Pending OTP Verification';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC function to atomically register a TODA and its admin
CREATE OR REPLACE FUNCTION public.register_toda_with_admin(
    p_toda_name VARCHAR(255),
    p_toda_acronym VARCHAR(50),
    p_registration_number VARCHAR(100),
    p_date_established DATE,
    p_terminal_latitude DOUBLE PRECISION,
    p_terminal_longitude DOUBLE PRECISION,
    p_barangay VARCHAR(100),
    p_service_coverage_area TEXT,
    p_contact_number VARCHAR(20),
    p_email VARCHAR(255),
    p_president_name VARCHAR(255),
    p_president_contact VARCHAR(20),
    p_vice_president_name VARCHAR(255),
    p_vice_president_contact VARCHAR(20),
    p_secretary_name VARCHAR(255),
    p_secretary_contact VARCHAR(20),
    p_treasurer_name VARCHAR(255),
    p_treasurer_contact VARCHAR(20),
    p_admin_full_name VARCHAR(255),
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
        account_status
    ) VALUES (
        p_toda_name,
        p_toda_acronym,
        p_registration_number,
        p_date_established,
        p_terminal_latitude,
        p_terminal_longitude,
        p_barangay,
        p_service_coverage_area,
        p_contact_number,
        p_email,
        p_president_name,
        p_president_contact,
        p_vice_president_name,
        p_vice_president_contact,
        p_secretary_name,
        p_secretary_contact,
        p_treasurer_name,
        p_treasurer_contact,
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
        p_admin_full_name,
        p_admin_email,
        p_admin_contact_number,
        'Active'
    );

    RETURN v_toda_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.register_toda_with_admin(
    VARCHAR(255), VARCHAR(50), VARCHAR(100), DATE, DOUBLE PRECISION, DOUBLE PRECISION,
    VARCHAR(100), TEXT, VARCHAR(20), VARCHAR(255), VARCHAR(255), VARCHAR(20),
    VARCHAR(255), VARCHAR(20), VARCHAR(255), VARCHAR(20), VARCHAR(255), VARCHAR(20),
    VARCHAR(255), VARCHAR(255), VARCHAR(20)
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_toda_with_admin(
    VARCHAR(255), VARCHAR(50), VARCHAR(100), DATE, DOUBLE PRECISION, DOUBLE PRECISION,
    VARCHAR(100), TEXT, VARCHAR(20), VARCHAR(255), VARCHAR(255), VARCHAR(20),
    VARCHAR(255), VARCHAR(20), VARCHAR(255), VARCHAR(20), VARCHAR(255), VARCHAR(20),
    VARCHAR(255), VARCHAR(255), VARCHAR(20)
) TO authenticated;

-- Helper: Retrieve assigned driver details for passenger active trip
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
    IF EXISTS (
        SELECT 1 FROM public.booking b
        WHERE b.booking_id = p_booking_id
        AND (
            b.passenger_id = public.get_current_passenger_id()
            OR b.toda_id = public.get_current_toda_admin_toda_id()
            OR public.is_lgu_admin()
        )
    ) THEN
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
    ELSE
        RAISE EXCEPTION 'Access denied. You are not authorized to view this driver details.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- 2. DROP ALL EXISTING POLICIES BEFORE RECREATION (IDEMPOTENT CLEANUP)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- 3. REWORKED ROW LEVEL SECURITY (RLS) POLICIES PER ROLE MODEL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: lgu_admin
-- ----------------------------------------------------------------------------
-- Bootstrapping Note: The first LGU Administrator account must be provisioned
-- server-side via trusted Service Role or direct linking SQL.
CREATE POLICY "lgu_admin_select_policy"
    ON public.lgu_admin FOR SELECT TO authenticated
    USING (public.is_lgu_admin() OR auth_user_id = auth.uid());

CREATE POLICY "lgu_admin_insert_policy"
    ON public.lgu_admin FOR INSERT TO authenticated
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "lgu_admin_update_policy"
    ON public.lgu_admin FOR UPDATE TO authenticated
    USING (public.is_lgu_admin() OR auth_user_id = auth.uid())
    WITH CHECK (public.is_lgu_admin() OR auth_user_id = auth.uid());

CREATE POLICY "lgu_admin_delete_policy"
    ON public.lgu_admin FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: toda
-- ----------------------------------------------------------------------------
-- Public Data Decision: Unauthenticated (anon) and authenticated passengers can
-- view active accredited TODAs on landing screens and registration selectors.
CREATE POLICY "toda_select_active_public"
    ON public.toda FOR SELECT TO anon, authenticated
    USING (account_status = 'Active');

CREATE POLICY "toda_select_admins"
    ON public.toda FOR SELECT TO authenticated
    USING (public.is_lgu_admin() OR toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "toda_insert_policy"
    ON public.toda FOR INSERT TO authenticated
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "toda_update_lgu_admin"
    ON public.toda FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "toda_update_toda_admin"
    ON public.toda FOR UPDATE TO authenticated
    USING (toda_id = public.get_current_toda_admin_toda_id())
    WITH CHECK (toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "toda_delete_policy"
    ON public.toda FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: toda_admin
-- ----------------------------------------------------------------------------
CREATE POLICY "toda_admin_select_policy"
    ON public.toda_admin FOR SELECT TO authenticated
    USING (public.is_lgu_admin() OR toda_id = public.get_current_toda_admin_toda_id() OR auth_user_id = auth.uid());

CREATE POLICY "toda_admin_insert_policy"
    ON public.toda_admin FOR INSERT TO authenticated
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "toda_admin_update_policy"
    ON public.toda_admin FOR UPDATE TO authenticated
    USING (public.is_lgu_admin() OR auth_user_id = auth.uid())
    WITH CHECK (public.is_lgu_admin() OR auth_user_id = auth.uid());

CREATE POLICY "toda_admin_delete_policy"
    ON public.toda_admin FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: passenger
-- ----------------------------------------------------------------------------
CREATE POLICY "passenger_select_self"
    ON public.passenger FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY "passenger_select_lgu"
    ON public.passenger FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "passenger_select_toda_admin"
    ON public.passenger FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.passenger_id = passenger.passenger_id 
        AND b.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "passenger_select_assigned_driver"
    ON public.passenger FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.passenger_id = passenger.passenger_id 
        AND b.driver_id = public.get_current_driver_id()
    ));

-- Self-registration: newly registered user inserts their own profile row
CREATE POLICY "passenger_insert_self"
    ON public.passenger FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "passenger_update_self"
    ON public.passenger FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "passenger_update_lgu"
    ON public.passenger FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "passenger_delete_lgu"
    ON public.passenger FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: driver
-- ----------------------------------------------------------------------------
CREATE POLICY "driver_select_self"
    ON public.driver FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY "driver_select_lgu"
    ON public.driver FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "driver_select_toda_admin"
    ON public.driver FOR SELECT TO authenticated
    USING (toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "driver_select_assigned_passenger"
    ON public.driver FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.driver_id = driver.driver_id 
        AND b.passenger_id = public.get_current_passenger_id()
    ));

-- Self-registration: newly registered driver inserts their initial profile row
CREATE POLICY "driver_insert_self"
    ON public.driver FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "driver_update_self"
    ON public.driver FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "driver_update_toda_admin"
    ON public.driver FOR UPDATE TO authenticated
    USING (toda_id = public.get_current_toda_admin_toda_id())
    WITH CHECK (toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "driver_update_lgu"
    ON public.driver FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "driver_delete_lgu"
    ON public.driver FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: driver_verification
-- ----------------------------------------------------------------------------
CREATE POLICY "driver_verification_select_driver"
    ON public.driver_verification FOR SELECT TO authenticated
    USING (driver_id = public.get_current_driver_id());

CREATE POLICY "driver_verification_select_toda_admin"
    ON public.driver_verification FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.driver d 
        WHERE d.driver_id = driver_verification.driver_id 
        AND d.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "driver_verification_select_lgu"
    ON public.driver_verification FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "driver_verification_insert_driver"
    ON public.driver_verification FOR INSERT TO authenticated
    WITH CHECK (driver_id = public.get_current_driver_id());

CREATE POLICY "driver_verification_update_driver"
    ON public.driver_verification FOR UPDATE TO authenticated
    USING (driver_id = public.get_current_driver_id() AND verification_status IN ('Pending', 'Resubmission Required'))
    WITH CHECK (driver_id = public.get_current_driver_id());

CREATE POLICY "driver_verification_update_toda_admin"
    ON public.driver_verification FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.driver d 
        WHERE d.driver_id = driver_verification.driver_id 
        AND d.toda_id = public.get_current_toda_admin_toda_id()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.driver d 
        WHERE d.driver_id = driver_verification.driver_id 
        AND d.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "driver_verification_update_lgu"
    ON public.driver_verification FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "driver_verification_delete_lgu"
    ON public.driver_verification FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: fare_matrix
-- ----------------------------------------------------------------------------
-- Public Data Decision: Unauthenticated (anon) and authenticated riders can
-- select the active municipal tariff schedule to calculate accurate fares.
CREATE POLICY "fare_matrix_select_active_public"
    ON public.fare_matrix FOR SELECT TO anon, authenticated
    USING (is_active = TRUE);

CREATE POLICY "fare_matrix_select_lgu"
    ON public.fare_matrix FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "fare_matrix_insert_lgu"
    ON public.fare_matrix FOR INSERT TO authenticated
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "fare_matrix_update_lgu"
    ON public.fare_matrix FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "fare_matrix_delete_lgu"
    ON public.fare_matrix FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: booking
-- ----------------------------------------------------------------------------
CREATE POLICY "booking_select_passenger"
    ON public.booking FOR SELECT TO authenticated
    USING (passenger_id = public.get_current_passenger_id());

CREATE POLICY "booking_select_driver"
    ON public.booking FOR SELECT TO authenticated
    USING (
        driver_id = public.get_current_driver_id() 
        OR (driver_id IS NULL AND booking_status = 'Pending')
    );

CREATE POLICY "booking_select_toda_admin"
    ON public.booking FOR SELECT TO authenticated
    USING (toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "booking_select_lgu"
    ON public.booking FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "booking_insert_passenger"
    ON public.booking FOR INSERT TO authenticated
    WITH CHECK (passenger_id = public.get_current_passenger_id());

CREATE POLICY "booking_update_passenger"
    ON public.booking FOR UPDATE TO authenticated
    USING (passenger_id = public.get_current_passenger_id())
    WITH CHECK (passenger_id = public.get_current_passenger_id());

-- Driver Booking Acceptance Fix: Allows driver to assign themselves to unassigned pending trips
CREATE POLICY "booking_update_driver_claim"
    ON public.booking FOR UPDATE TO authenticated
    USING (driver_id IS NULL AND booking_status = 'Pending')
    WITH CHECK (driver_id = public.get_current_driver_id());

CREATE POLICY "booking_update_driver_assigned"
    ON public.booking FOR UPDATE TO authenticated
    USING (driver_id = public.get_current_driver_id())
    WITH CHECK (driver_id = public.get_current_driver_id());

CREATE POLICY "booking_update_toda_admin"
    ON public.booking FOR UPDATE TO authenticated
    USING (toda_id = public.get_current_toda_admin_toda_id())
    WITH CHECK (toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "booking_update_lgu"
    ON public.booking FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "booking_delete_lgu"
    ON public.booking FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: dispatch_attempt
-- ----------------------------------------------------------------------------
CREATE POLICY "dispatch_attempt_select_driver"
    ON public.dispatch_attempt FOR SELECT TO authenticated
    USING (driver_id = public.get_current_driver_id());

CREATE POLICY "dispatch_attempt_select_passenger"
    ON public.dispatch_attempt FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = dispatch_attempt.booking_id 
        AND b.passenger_id = public.get_current_passenger_id()
    ));

CREATE POLICY "dispatch_attempt_select_toda_admin"
    ON public.dispatch_attempt FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = dispatch_attempt.booking_id 
        AND b.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "dispatch_attempt_select_lgu"
    ON public.dispatch_attempt FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "dispatch_attempt_insert"
    ON public.dispatch_attempt FOR INSERT TO authenticated
    WITH CHECK (
        public.is_lgu_admin() 
        OR EXISTS (
            SELECT 1 FROM public.booking b 
            WHERE b.booking_id = dispatch_attempt.booking_id 
            AND b.passenger_id = public.get_current_passenger_id()
        )
    );

CREATE POLICY "dispatch_attempt_update_driver"
    ON public.dispatch_attempt FOR UPDATE TO authenticated
    USING (driver_id = public.get_current_driver_id())
    WITH CHECK (driver_id = public.get_current_driver_id());

CREATE POLICY "dispatch_attempt_all_lgu"
    ON public.dispatch_attempt FOR ALL TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: shared_trip_match
-- ----------------------------------------------------------------------------
CREATE POLICY "shared_trip_match_select_passenger"
    ON public.shared_trip_match FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE (b.booking_id = shared_trip_match.primary_booking_id OR b.booking_id = shared_trip_match.additional_booking_id) 
        AND b.passenger_id = public.get_current_passenger_id()
    ));

CREATE POLICY "shared_trip_match_select_driver"
    ON public.shared_trip_match FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = shared_trip_match.primary_booking_id 
        AND b.driver_id = public.get_current_driver_id()
    ));

CREATE POLICY "shared_trip_match_select_toda_admin"
    ON public.shared_trip_match FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = shared_trip_match.primary_booking_id 
        AND b.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "shared_trip_match_select_lgu"
    ON public.shared_trip_match FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "shared_trip_match_insert"
    ON public.shared_trip_match FOR INSERT TO authenticated
    WITH CHECK (
        public.is_lgu_admin() 
        OR EXISTS (
            SELECT 1 FROM public.booking b 
            WHERE b.booking_id = shared_trip_match.primary_booking_id 
            AND b.passenger_id = public.get_current_passenger_id()
        )
    );

CREATE POLICY "shared_trip_match_update_driver"
    ON public.shared_trip_match FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = shared_trip_match.primary_booking_id 
        AND b.driver_id = public.get_current_driver_id()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = shared_trip_match.primary_booking_id 
        AND b.driver_id = public.get_current_driver_id()
    ));

CREATE POLICY "shared_trip_match_all_lgu"
    ON public.shared_trip_match FOR ALL TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: cancellation_record
-- ----------------------------------------------------------------------------
CREATE POLICY "cancellation_record_select_passenger"
    ON public.cancellation_record FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = cancellation_record.booking_id 
        AND b.passenger_id = public.get_current_passenger_id()
    ));

CREATE POLICY "cancellation_record_select_driver"
    ON public.cancellation_record FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = cancellation_record.booking_id 
        AND b.driver_id = public.get_current_driver_id()
    ));

CREATE POLICY "cancellation_record_select_toda_admin"
    ON public.cancellation_record FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = cancellation_record.booking_id 
        AND b.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "cancellation_record_select_lgu"
    ON public.cancellation_record FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "cancellation_record_insert"
    ON public.cancellation_record FOR INSERT TO authenticated
    WITH CHECK (
        public.is_lgu_admin()
        OR EXISTS (
            SELECT 1 FROM public.booking b 
            WHERE b.booking_id = cancellation_record.booking_id 
            AND (b.passenger_id = public.get_current_passenger_id() OR b.driver_id = public.get_current_driver_id())
        )
    );

CREATE POLICY "cancellation_record_all_lgu"
    ON public.cancellation_record FOR ALL TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: gps_log
-- ----------------------------------------------------------------------------
CREATE POLICY "gps_log_select_driver"
    ON public.gps_log FOR SELECT TO authenticated
    USING (driver_id = public.get_current_driver_id());

CREATE POLICY "gps_log_select_passenger"
    ON public.gps_log FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = gps_log.booking_id 
        AND b.passenger_id = public.get_current_passenger_id()
    ));

CREATE POLICY "gps_log_select_toda_admin"
    ON public.gps_log FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = gps_log.booking_id 
        AND b.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "gps_log_select_lgu"
    ON public.gps_log FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "gps_log_insert_driver"
    ON public.gps_log FOR INSERT TO authenticated
    WITH CHECK (driver_id = public.get_current_driver_id());

CREATE POLICY "gps_log_all_lgu"
    ON public.gps_log FOR ALL TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: rating
-- ----------------------------------------------------------------------------
CREATE POLICY "rating_select_participants"
    ON public.rating FOR SELECT TO authenticated
    USING (
        rater_id = public.get_current_passenger_id() 
        OR rater_id = public.get_current_driver_id() 
        OR ratee_id = public.get_current_passenger_id() 
        OR ratee_id = public.get_current_driver_id()
    );

CREATE POLICY "rating_select_toda_admin"
    ON public.rating FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = rating.booking_id 
        AND b.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "rating_select_lgu"
    ON public.rating FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "rating_insert_participant"
    ON public.rating FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = rating.booking_id 
        AND (b.passenger_id = public.get_current_passenger_id() OR b.driver_id = public.get_current_driver_id())
    ));

CREATE POLICY "rating_all_lgu"
    ON public.rating FOR ALL TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: incident_report
-- ----------------------------------------------------------------------------
CREATE POLICY "incident_report_select_passenger"
    ON public.incident_report FOR SELECT TO authenticated
    USING (passenger_id = public.get_current_passenger_id());

CREATE POLICY "incident_report_select_driver"
    ON public.incident_report FOR SELECT TO authenticated
    USING (driver_id = public.get_current_driver_id());

CREATE POLICY "incident_report_select_toda_admin"
    ON public.incident_report FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = incident_report.booking_id 
        AND b.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "incident_report_select_lgu"
    ON public.incident_report FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "incident_report_insert_passenger"
    ON public.incident_report FOR INSERT TO authenticated
    WITH CHECK (passenger_id = public.get_current_passenger_id());

CREATE POLICY "incident_report_insert_driver"
    ON public.incident_report FOR INSERT TO authenticated
    WITH CHECK (driver_id = public.get_current_driver_id());

CREATE POLICY "incident_report_update_passenger"
    ON public.incident_report FOR UPDATE TO authenticated
    USING (passenger_id = public.get_current_passenger_id() AND status = 'Pending')
    WITH CHECK (passenger_id = public.get_current_passenger_id());

CREATE POLICY "incident_report_update_toda_admin"
    ON public.incident_report FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = incident_report.booking_id 
        AND b.toda_id = public.get_current_toda_admin_toda_id()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.booking b 
        WHERE b.booking_id = incident_report.booking_id 
        AND b.toda_id = public.get_current_toda_admin_toda_id()
    ));

CREATE POLICY "incident_report_update_lgu"
    ON public.incident_report FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "incident_report_delete_lgu"
    ON public.incident_report FOR DELETE TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: notification
-- ----------------------------------------------------------------------------
CREATE POLICY "notification_select_passenger"
    ON public.notification FOR SELECT TO authenticated
    USING (passenger_id = public.get_current_passenger_id());

CREATE POLICY "notification_select_driver"
    ON public.notification FOR SELECT TO authenticated
    USING (driver_id = public.get_current_driver_id());

CREATE POLICY "notification_select_lgu"
    ON public.notification FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "notification_insert"
    ON public.notification FOR INSERT TO authenticated
    WITH CHECK (
        passenger_id = public.get_current_passenger_id() 
        OR driver_id = public.get_current_driver_id() 
        OR public.is_lgu_admin()
    );

CREATE POLICY "notification_update_passenger"
    ON public.notification FOR UPDATE TO authenticated
    USING (passenger_id = public.get_current_passenger_id())
    WITH CHECK (passenger_id = public.get_current_passenger_id());

CREATE POLICY "notification_update_driver"
    ON public.notification FOR UPDATE TO authenticated
    USING (driver_id = public.get_current_driver_id())
    WITH CHECK (driver_id = public.get_current_driver_id());

CREATE POLICY "notification_update_lgu"
    ON public.notification FOR UPDATE TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "notification_delete_owner"
    ON public.notification FOR DELETE TO authenticated
    USING (
        passenger_id = public.get_current_passenger_id() 
        OR driver_id = public.get_current_driver_id() 
        OR public.is_lgu_admin()
    );

-- ----------------------------------------------------------------------------
-- TABLE: announcement
-- ----------------------------------------------------------------------------
CREATE POLICY "announcement_select_driver"
    ON public.announcement FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.driver d 
        WHERE d.driver_id = public.get_current_driver_id() 
        AND d.toda_id = announcement.toda_id
    ));

CREATE POLICY "announcement_select_toda_admin"
    ON public.announcement FOR SELECT TO authenticated
    USING (toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "announcement_select_lgu"
    ON public.announcement FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "announcement_insert_toda_admin"
    ON public.announcement FOR INSERT TO authenticated
    WITH CHECK (toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "announcement_update_toda_admin"
    ON public.announcement FOR UPDATE TO authenticated
    USING (toda_id = public.get_current_toda_admin_toda_id())
    WITH CHECK (toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "announcement_delete_toda_admin"
    ON public.announcement FOR DELETE TO authenticated
    USING (toda_id = public.get_current_toda_admin_toda_id());

CREATE POLICY "announcement_all_lgu"
    ON public.announcement FOR ALL TO authenticated
    USING (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: analytics_log
-- ----------------------------------------------------------------------------
CREATE POLICY "analytics_log_select_lgu"
    ON public.analytics_log FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "analytics_log_manage_lgu"
    ON public.analytics_log FOR ALL TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

-- ----------------------------------------------------------------------------
-- TABLE: analytics_report
-- ----------------------------------------------------------------------------
CREATE POLICY "analytics_report_select_lgu"
    ON public.analytics_report FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "analytics_report_select_toda_admin"
    ON public.analytics_report FOR SELECT TO authenticated
    USING (generated_by_toda_admin = (
        SELECT admin_id FROM public.toda_admin WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "analytics_report_all_lgu"
    ON public.analytics_report FOR ALL TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

CREATE POLICY "analytics_report_insert_toda_admin"
    ON public.analytics_report FOR INSERT TO authenticated
    WITH CHECK (generated_by_toda_admin = (
        SELECT admin_id FROM public.toda_admin WHERE auth_user_id = auth.uid()
    ));

-- ----------------------------------------------------------------------------
-- TABLE: audit_log
-- ----------------------------------------------------------------------------
CREATE POLICY "audit_log_select_lgu"
    ON public.audit_log FOR SELECT TO authenticated
    USING (public.is_lgu_admin());

CREATE POLICY "audit_log_select_toda_admin"
    ON public.audit_log FOR SELECT TO authenticated
    USING (toda_admin_id = (
        SELECT admin_id FROM public.toda_admin WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "audit_log_insert_authenticated"
    ON public.audit_log FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_log_manage_lgu"
    ON public.audit_log FOR ALL TO authenticated
    USING (public.is_lgu_admin());

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY ON ALL 19 TABLES
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
-- 5. PERFORMANCE INDEXES (FOR UNINDEXED FOREIGN KEYS & LOOKUPS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_toda_admin_toda_id ON public.toda_admin(toda_id);
CREATE INDEX IF NOT EXISTS idx_driver_toda_id ON public.driver(toda_id);
CREATE INDEX IF NOT EXISTS idx_driver_verification_driver_id ON public.driver_verification(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_verification_reviewed_by ON public.driver_verification(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_driver_verification_reviewed_by_lgu ON public.driver_verification(reviewed_by_lgu);
CREATE INDEX IF NOT EXISTS idx_fare_matrix_configured_by ON public.fare_matrix(configured_by);
CREATE INDEX IF NOT EXISTS idx_booking_toda_id ON public.booking(toda_id);
CREATE INDEX IF NOT EXISTS idx_booking_shared_trip_match_id ON public.booking(shared_trip_match_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_attempt_booking_id ON public.dispatch_attempt(booking_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_attempt_driver_id ON public.dispatch_attempt(driver_id);
CREATE INDEX IF NOT EXISTS idx_shared_trip_match_primary_booking ON public.shared_trip_match(primary_booking_id);
CREATE INDEX IF NOT EXISTS idx_shared_trip_match_additional_booking ON public.shared_trip_match(additional_booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_record_booking_id ON public.cancellation_record(booking_id);
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
-- 6. SUPABASE REALTIME PUBLICATION REGISTRATION
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
-- 7. SUPABASE STORAGE BUCKETS & STORAGE RLS POLICIES
-- ============================================================================

-- Provision required private storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('driver-licenses', 'driver-licenses', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('mtop-permits', 'mtop-permits', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('tricycle-photos', 'tricycle-photos', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('barangay-clearances', 'barangay-clearances', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('incident-evidence', 'incident-evidence', FALSE, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']),
    ('profile-photos', 'profile-photos', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('reports', 'reports', FALSE, 20971520, ARRAY['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop previous storage object policies if any
DROP POLICY IF EXISTS "storage_lgu_admin_all" ON storage.objects;
DROP POLICY IF EXISTS "storage_profile_photos_self" ON storage.objects;
DROP POLICY IF EXISTS "storage_driver_docs_self" ON storage.objects;
DROP POLICY IF EXISTS "storage_driver_docs_toda_admin" ON storage.objects;
DROP POLICY IF EXISTS "storage_incident_evidence_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_incident_evidence_view" ON storage.objects;
DROP POLICY IF EXISTS "storage_reports_toda_admin" ON storage.objects;

-- Storage Policy: LGU Admins have full access across all buckets
CREATE POLICY "storage_lgu_admin_all"
    ON storage.objects FOR ALL TO authenticated
    USING (public.is_lgu_admin())
    WITH CHECK (public.is_lgu_admin());

-- Storage Policy: Authenticated users manage own profile photo (folder = auth.uid())
CREATE POLICY "storage_profile_photos_self"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage Policy: Drivers manage own onboarding documents
CREATE POLICY "storage_driver_docs_self"
    ON storage.objects FOR ALL TO authenticated
    USING (
        bucket_id IN ('driver-licenses', 'mtop-permits', 'tricycle-photos', 'barangay-clearances') 
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id IN ('driver-licenses', 'mtop-permits', 'tricycle-photos', 'barangay-clearances') 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage Policy: TODA Admins view documents of affiliated drivers
CREATE POLICY "storage_driver_docs_toda_admin"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id IN ('driver-licenses', 'mtop-permits', 'tricycle-photos', 'barangay-clearances')
        AND EXISTS (
            SELECT 1 FROM public.driver d 
            WHERE d.auth_user_id::text = (storage.foldername(name))[1]
            AND d.toda_id = public.get_current_toda_admin_toda_id()
        )
    );

-- Storage Policy: Users upload incident evidence
CREATE POLICY "storage_incident_evidence_upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'incident-evidence' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage Policy: Users view incident evidence for reports they are involved in
CREATE POLICY "storage_incident_evidence_view"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'incident-evidence'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_lgu_admin()
            OR EXISTS (SELECT 1 FROM public.toda_admin ta WHERE ta.auth_user_id = auth.uid())
        )
    );

-- Storage Policy: TODA Admins access reports they generated
CREATE POLICY "storage_reports_toda_admin"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'reports' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
