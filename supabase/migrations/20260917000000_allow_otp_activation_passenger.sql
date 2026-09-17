-- ============================================================================
-- Migration: 20260917000000_allow_otp_activation_passenger.sql
-- Purpose:
--   1. Allow passengers to transition their account_status from 'Pending OTP Verification'
--      to 'Active' upon completing OTP SMS verification.
--   2. Provide a SECURITY DEFINER RPC function `activate_passenger_otp` so both the backend
--      API and client can reliably activate passenger records in public.passenger.
-- ============================================================================

-- 1. Update protect_read_only_columns trigger function to permit Pending OTP Verification -> Active transition
CREATE OR REPLACE FUNCTION public.protect_read_only_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- LGU admins have full permission to modify all columns
    IF public.is_lgu_admin() THEN
        RETURN NEW;
    END IF;

    -- Passenger table column protection
    IF TG_TABLE_NAME = 'passenger' THEN
        -- Allow transition from Pending OTP Verification to Active upon verifying OTP
        IF OLD.account_status = 'Pending OTP Verification' AND NEW.account_status = 'Active' THEN
            RETURN NEW;
        END IF;

        -- Prevent arbitrary unauthorized modifications to account_status
        IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
            RAISE EXCEPTION 'Access Denied: Passengers cannot modify their own account_status.';
        END IF;
    END IF;

    -- Driver table column protection
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

    -- Driver verification table column protection
    IF TG_TABLE_NAME = 'driver_verification' THEN
        IF EXISTS (
            SELECT 1 FROM public.driver d 
            WHERE d.driver_id = OLD.driver_id 
            AND d.auth_user_id = auth.uid()
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

-- 2. Dedicated RPC function to activate passenger account by phone number
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

-- Grant execution permissions on the RPC function
GRANT EXECUTE ON FUNCTION public.activate_passenger_otp(TEXT) TO anon, authenticated, service_role;

-- 3. Ensure authenticated passengers can update their own row
DROP POLICY IF EXISTS "passenger_update_self" ON public.passenger;
CREATE POLICY "passenger_update_self"
    ON public.passenger FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());
