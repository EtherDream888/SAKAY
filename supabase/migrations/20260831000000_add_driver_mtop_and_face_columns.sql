-- Migration: Add missing MTOP, Face Verification, and Document Storage columns to driver & driver_verification tables
-- Description: Extends public.driver and public.driver_verification to store full MTOP details, face matching status, and storage paths.

ALTER TABLE public.driver
    ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vehicle_make VARCHAR(100),
    ADD COLUMN IF NOT EXISTS motor_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS or_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS authorized_route TEXT;

ALTER TABLE public.driver_verification
    ADD COLUMN IF NOT EXISTS submitted_chassis_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS submitted_vehicle_make VARCHAR(100),
    ADD COLUMN IF NOT EXISTS submitted_motor_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS submitted_or_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS submitted_authorized_route TEXT,
    ADD COLUMN IF NOT EXISTS face_verification_status VARCHAR(50) DEFAULT 'Passed',
    ADD COLUMN IF NOT EXISTS face_photo_path TEXT,
    ADD COLUMN IF NOT EXISTS mtop_photo_path TEXT,
    ADD COLUMN IF NOT EXISTS license_front_photo_path TEXT,
    ADD COLUMN IF NOT EXISTS license_back_photo_path TEXT;

-- Update trigger function to allow driver updates for newly added profile columns
CREATE OR REPLACE FUNCTION protect_read_only_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'passenger' THEN
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

        -- Regular driver profile updates: check restricted system-only fields
        IF NEW.account_status IS DISTINCT FROM OLD.account_status OR
           NEW.weighted_average_rating IS DISTINCT FROM OLD.weighted_average_rating THEN
            RAISE EXCEPTION 'Access Denied: Drivers cannot modify account status or weighted average rating.';
        END IF;
    END IF;

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
