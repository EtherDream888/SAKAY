-- ============================================================================
-- Migration: 20261004000004_batch3_enforcement_guards.sql
-- Batch 3 (Step 3): Authoritative enforcement of suspension / deactivation.
--
-- Until now the restriction was checked only in React. These guards run in the
-- database, evaluate suspended_until against the live clock
-- (account_restriction_state), and cannot be bypassed by a modified client:
--
--   * a restricted passenger cannot create a booking          (booking INSERT)
--   * a restricted driver cannot be offered a booking         (dispatch_attempt INSERT)
--   * a restricted driver cannot accept a booking             (booking UPDATE driver_id)
--   * a restricted driver cannot go online, and is forced
--     offline when a trip ends while restricted               (driver availability)
--
-- An ACTIVE trip is never interrupted by a new suspension: guards apply only to
-- new bookings, offers and going online.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._restriction_message(p_state JSONB)
RETURNS TEXT AS $$
DECLARE
    v_kind TEXT := p_state->>'kind';
    v_until TIMESTAMPTZ := NULLIF(p_state->>'until', '')::TIMESTAMPTZ;
BEGIN
    IF v_kind IN ('DEACTIVATED', 'CLOSED') THEN
        RETURN 'ERR_ACCOUNT_DEACTIVATED: Na-deactivate ang iyong account at nangangailangan ng pagsusuri ng LGU. ' ||
               '(Your account is deactivated and requires LGU review.) [kind=' || v_kind || ']';
    ELSIF v_until IS NOT NULL THEN
        RETURN 'ERR_ACCOUNT_SUSPENDED: Suspendido ang iyong account hanggang ' || public._fmt_manila(v_until) ||
               '. (Your account is suspended until ' || public._fmt_manila(v_until) || '.) [kind=' || v_kind ||
               ' until=' || to_char(v_until AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || ']';
    END IF;
    RETURN 'ERR_ACCOUNT_SUSPENDED: Pansamantalang sinuspinde ang iyong account habang may imbestigasyon. ' ||
           '(Your account is suspended pending investigation.) [kind=' || COALESCE(v_kind, 'SUSPENDED') || ']';
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 1. Passengers: no new booking while suspended or deactivated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_restricted_passenger_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_state JSONB;
BEGIN
    IF NEW.passenger_id IS NULL THEN
        RETURN NEW;
    END IF;
    v_state := public.account_restriction_state('passenger', NEW.passenger_id);
    IF COALESCE((v_state->>'restricted')::BOOLEAN, FALSE) THEN
        RAISE EXCEPTION '%', public._restriction_message(v_state) USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_block_restricted_passenger_booking ON public.booking;
CREATE TRIGGER trigger_block_restricted_passenger_booking
    BEFORE INSERT ON public.booking
    FOR EACH ROW
    EXECUTE FUNCTION public.block_restricted_passenger_booking();

-- ----------------------------------------------------------------------------
-- 2. Drivers: no offers and no acceptance while suspended or deactivated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_restricted_driver_offer()
RETURNS TRIGGER AS $$
DECLARE
    v_state JSONB;
BEGIN
    IF NEW.driver_id IS NULL THEN
        RETURN NEW;
    END IF;
    v_state := public.account_restriction_state('driver', NEW.driver_id);
    IF COALESCE((v_state->>'restricted')::BOOLEAN, FALSE) THEN
        RAISE EXCEPTION '%', public._restriction_message(v_state) USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_block_restricted_driver_offer ON public.dispatch_attempt;
CREATE TRIGGER trigger_block_restricted_driver_offer
    BEFORE INSERT ON public.dispatch_attempt
    FOR EACH ROW
    EXECUTE FUNCTION public.block_restricted_driver_offer();

DROP TRIGGER IF EXISTS trigger_block_restricted_driver_accept ON public.booking;
CREATE TRIGGER trigger_block_restricted_driver_accept
    BEFORE UPDATE OF driver_id ON public.booking
    FOR EACH ROW
    WHEN (NEW.driver_id IS NOT NULL AND NEW.driver_id IS DISTINCT FROM OLD.driver_id)
    EXECUTE FUNCTION public.block_restricted_driver_offer();   -- booking.driver_id, same column name

-- ----------------------------------------------------------------------------
-- 3. Drivers: going online / staying online
-- ----------------------------------------------------------------------------
-- Replaces the Batch 1 function (same name, same trigger) with the suspension /
-- deactivation check added FIRST, so the driver sees the real reason and end
-- date. Everything else is the Batch 1 behaviour, unchanged.
CREATE OR REPLACE FUNCTION public.check_driver_online_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_res JSONB;
    v_state JSONB;
BEGIN
    -- Block transition from Offline -> Available / Busy
    IF (OLD.availability_status = 'Offline' AND NEW.availability_status IN ('Available', 'Busy')) THEN
        v_state := public.account_restriction_state('driver', NEW.driver_id);
        IF COALESCE((v_state->>'restricted')::BOOLEAN, FALSE) THEN
            RAISE EXCEPTION '%', public._restriction_message(v_state) USING ERRCODE = 'P0001';
        END IF;

        IF NEW.account_status != 'Verified' THEN
            RAISE EXCEPTION 'ERR_DRIVER_NOT_VERIFIED: Hindi maaaring mag-online hangga''t hindi ganap na aprubado ng LGU ang account (Driver must be Verified by LGU before going online).';
        END IF;

        v_res := public.is_driver_documentarily_restricted(NEW.driver_id);
        IF (v_res->>'is_restricted')::BOOLEAN = TRUE THEN
            RAISE EXCEPTION 'ERR_DOCUMENT_EXPIRED: Hindi maaaring mag-online dahil sa expired o kulang na dokumento: %', v_res->>'reasons';
        END IF;
    END IF;

    -- When a trip completes (Busy -> Available), force offline if the driver became
    -- restricted during the trip (suspension/deactivation or documentary restriction).
    IF (OLD.availability_status = 'Busy' AND NEW.availability_status = 'Available') THEN
        v_state := public.account_restriction_state('driver', NEW.driver_id);
        v_res := public.is_driver_documentarily_restricted(NEW.driver_id);
        IF COALESCE((v_state->>'restricted')::BOOLEAN, FALSE) OR (v_res->>'is_restricted')::BOOLEAN = TRUE THEN
            NEW.availability_status := 'Offline';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- PRIVILEGES: trigger functions are not callable from clients
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.block_restricted_passenger_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_restricted_driver_offer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._restriction_message(JSONB) FROM PUBLIC, anon, authenticated;
