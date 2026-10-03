-- ============================================================================
-- Migration: 20261003000002_otp_lockout_trigger.sql
-- Batch 2: OTP lockout helper functions and resend rate-limit columns.
--
-- Changes from original:
--   • check_otp_lockout now accepts p_contact_number TEXT (was UUID).
--     It looks up the passenger row by any phone format, then evaluates lockout.
--   • Added columns for server-side resend cooldown and daily cap:
--       otp_last_sent_at    TIMESTAMPTZ  -- timestamp of most recent OTP send
--       otp_daily_count     INT DEFAULT 0 -- OTPs sent today
--       otp_daily_reset_at  DATE          -- date on which daily count was last reset
-- ============================================================================

BEGIN;

-- ── New columns for resend rate limiting ─────────────────────────────────────
ALTER TABLE public.passenger
    ADD COLUMN IF NOT EXISTS otp_last_sent_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_daily_count     INT         DEFAULT 0,
    ADD COLUMN IF NOT EXISTS otp_daily_reset_at  DATE;

-- ── increment_failed_otp(UUID) ───────────────────────────────────────────────
-- Called after each wrong OTP entry. Increments the attempt counter and
-- records the failure timestamp so the lockout window can be evaluated.
CREATE OR REPLACE FUNCTION public.increment_failed_otp(p_passenger_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.passenger
       SET failed_otp_attempts = COALESCE(failed_otp_attempts, 0) + 1,
           last_otp_failed_at  = NOW()
     WHERE passenger_id = p_passenger_id;
END;
$$;

-- ── reset_failed_otp(UUID) ───────────────────────────────────────────────────
-- Called after a successful OTP verification. Clears the failure counters so
-- the next OTP session starts clean.
CREATE OR REPLACE FUNCTION public.reset_failed_otp(p_passenger_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.passenger
       SET failed_otp_attempts = 0,
           last_otp_failed_at  = NULL
     WHERE passenger_id = p_passenger_id;
END;
$$;

-- ── check_otp_lockout(p_contact_number TEXT) ─────────────────────────────────
-- Accepts any Philippine phone format (+639xx / 09xx / 639xx / 9xxxxxxxxx).
-- Returns a JSONB object: { is_locked BOOLEAN, minutes_remaining NUMERIC }.
-- Callers must inspect is_locked; a TRUE result means the passenger must wait.
--
-- Lockout policy (Rule 4.7):
--   5 consecutive failed attempts → 15-minute lockout from last_otp_failed_at.
CREATE OR REPLACE FUNCTION public.check_otp_lockout(p_contact_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean       TEXT;
    v_attempts    INT;
    v_last_failed TIMESTAMPTZ;
    v_elapsed     INTERVAL;
    v_remaining   NUMERIC;
BEGIN
    -- Normalise to the 10-digit local portion (9xxxxxxxxx) for flexible matching
    v_clean := regexp_replace(COALESCE(p_contact_number, ''), '\D', '', 'g');
    IF v_clean LIKE '639%'  THEN v_clean := substring(v_clean FROM 3); END IF;
    IF v_clean LIKE '09%'   THEN v_clean := substring(v_clean FROM 2); END IF;
    IF v_clean LIKE '63%'   THEN v_clean := substring(v_clean FROM 3); END IF;

    SELECT failed_otp_attempts, last_otp_failed_at
      INTO v_attempts, v_last_failed
      FROM public.passenger
     WHERE contact_number IN (
               '+63' || v_clean,
               '0'   || v_clean,
               '63'  || v_clean,
               v_clean,
               p_contact_number
           )
     LIMIT 1;

    -- No passenger found → not locked
    IF v_attempts IS NULL THEN
        RETURN jsonb_build_object('is_locked', false, 'minutes_remaining', 0);
    END IF;

    -- Fewer than 5 failures → not locked
    IF v_attempts < 5 THEN
        RETURN jsonb_build_object('is_locked', false, 'minutes_remaining', 0);
    END IF;

    -- 5+ failures → check whether the 15-minute window has expired
    IF v_last_failed IS NULL THEN
        RETURN jsonb_build_object('is_locked', false, 'minutes_remaining', 0);
    END IF;

    v_elapsed := NOW() - v_last_failed;

    IF v_elapsed < INTERVAL '15 minutes' THEN
        v_remaining := EXTRACT(EPOCH FROM (INTERVAL '15 minutes' - v_elapsed)) / 60;
        RETURN jsonb_build_object(
            'is_locked',          true,
            'minutes_remaining',  ROUND(v_remaining::NUMERIC, 1)
        );
    END IF;

    -- Lockout window has passed → no longer locked
    RETURN jsonb_build_object('is_locked', false, 'minutes_remaining', 0);
END;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.increment_failed_otp(UUID)    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_failed_otp(UUID)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_otp_lockout(TEXT)        TO authenticated, service_role, anon;

COMMIT;
