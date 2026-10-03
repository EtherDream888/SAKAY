-- ============================================================================
-- Migration: 20261004000001_batch3_strike_foundation.sql
-- Batch 3 (Step 1): Strike / suspension / deactivation / exemption foundation.
--
-- Scope (Sections 1, 20, 21, 22, 25 of Appendix B):
--   1. Retire the ad-hoc PI-09 booking-abuse strike function, trigger and
--      columns (replaced by the canonical engine in migration ..0002).
--   2. Add suspension / deactivation state columns to passenger and driver.
--   3. Reset legacy test strike counts to 0 (decision D3).
--   4. violation_catalog, strikes_ledger and exemption_request tables.
--   5. Policy constants (ladder, window, exemption deadlines) as DB code
--      constants (decision D6); strike_accrual_paused switch in
--      system_policy_config (decision D6).
--   6. Helper functions shared by the engine and the guards.
--   7. protect_read_only_columns: strike / suspension / deactivation columns
--      can only be written by the policy engine or the service role.
--   8. RLS: users can read their own rows; nobody writes directly.
--
-- Suspension lengths (decision F3.3 override): 3 days at 5 strikes,
-- 7 days at 8 strikes. Appeal windows (decision D1): 72 hours.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RETIRE PI-09 AD-HOC STRIKE LOGIC (replaced by issue_strike in ..0002)
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_cancellation_abuse ON public.booking;
DROP FUNCTION IF EXISTS public.check_cancellation_abuse();
DROP FUNCTION IF EXISTS public.issue_booking_abuse_strike(UUID, TEXT);

ALTER TABLE public.passenger
    DROP COLUMN IF EXISTS strike_count,
    DROP COLUMN IF EXISTS last_strike_at,
    DROP COLUMN IF EXISTS is_suspended;

-- ----------------------------------------------------------------------------
-- 2. ACCOUNT STATE COLUMNS (passenger and driver)
-- ----------------------------------------------------------------------------
-- strikes_count is a CACHE of the active 90-day total; the ledger is the
-- source of truth. suspended_until NULL + suspension_kind 'INVESTIGATION' is an
-- open-ended suspension pending TODA/LGU investigation (PI-B6).

ALTER TABLE public.passenger
    ADD COLUMN IF NOT EXISTS strikes_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspension_kind VARCHAR(20)
        CHECK (suspension_kind IN ('LADDER', 'ADMIN', 'INVESTIGATION')),
    ADD COLUMN IF NOT EXISTS suspension_trigger_strike_id UUID,
    ADD COLUMN IF NOT EXISTS suspension_threshold INTEGER,
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE public.driver
    ADD COLUMN IF NOT EXISTS strikes_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspension_kind VARCHAR(20)
        CHECK (suspension_kind IN ('LADDER', 'ADMIN', 'INVESTIGATION')),
    ADD COLUMN IF NOT EXISTS suspension_trigger_strike_id UUID,
    ADD COLUMN IF NOT EXISTS suspension_threshold INTEGER,
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- 3. D3: RESET LEGACY STRIKE TEST DATA
-- ----------------------------------------------------------------------------
-- Old logic suspended accounts at 3 strikes with the reason prefix
-- 'Automated platform suspension:'. Those suspensions had no policy basis, so
-- they are lifted together with the counts. Manual suspensions are kept and
-- become open-ended (admin must reinstate them).

-- Runs ONLY on the first application of this migration (strikes_ledger is created
-- further down). If the migration is ever re-applied, real strikes must not be wiped.
DO $$
BEGIN
    IF to_regclass('public.strikes_ledger') IS NOT NULL THEN
        RETURN;
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    UPDATE public.passenger SET strikes_count = 0 WHERE strikes_count <> 0;
    UPDATE public.driver SET strikes_count = 0 WHERE strikes_count <> 0;

    UPDATE public.passenger
    SET account_status = 'Active', suspension_reason = NULL, suspended_at = NULL
    WHERE account_status = 'Suspended'
      AND suspension_reason LIKE 'Automated platform suspension:%';

    UPDATE public.driver
    SET account_status = 'Verified', suspension_reason = NULL, suspended_at = NULL
    WHERE account_status = 'Suspended'
      AND suspension_reason LIKE 'Automated platform suspension:%';

    UPDATE public.passenger SET suspension_kind = 'INVESTIGATION'
    WHERE account_status = 'Suspended' AND suspension_kind IS NULL;

    UPDATE public.driver SET suspension_kind = 'INVESTIGATION'
    WHERE account_status = 'Suspended' AND suspension_kind IS NULL;

    PERFORM set_config('sakay.internal_context', '', true);
END $$;

-- ----------------------------------------------------------------------------
-- 4. POLICY CONSTANTS (decision D6: ladder values are code constants)
-- ----------------------------------------------------------------------------
-- Mirrored for display in packages/shared/src/config/policyConfig.ts.

CREATE OR REPLACE FUNCTION public.strike_policy_constant(p_key TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
    SELECT CASE p_key
        WHEN 'window_days'                      THEN 90   -- Sections 20/21 rolling window
        WHEN 'warning_threshold'                THEN 1
        WHEN 'review_threshold'                 THEN 3
        WHEN 'suspension_1_threshold'           THEN 5
        WHEN 'suspension_1_days'                THEN 3    -- F3.3 override (policy text: 7)
        WHEN 'suspension_2_threshold'           THEN 8
        WHEN 'suspension_2_days'                THEN 7    -- F3.3 override (policy text: 30)
        WHEN 'deactivation_threshold'           THEN 10
        WHEN 'exemption_window_hours'           THEN 72   -- D1 override (policy text: 48)
        WHEN 'exemption_decision_business_days' THEN 3    -- Rule 25.6
        WHEN 'exemption_repeat_limit'           THEN 3    -- Rule 25.7: requests reviewed; the next is denied
        WHEN 'exemption_repeat_window_days'     THEN 30   -- Rule 25.7
        WHEN 'repeat_violation_window_days'     THEN 30   -- PI-B3 definition of "repeated"
        ELSE NULL
    END;
$$;

-- strike_accrual_paused switch lives in system_policy_config (decision D6).
-- The internal-context flag lets this INSERT pass the protection trigger when the
-- migration is re-applied (the trigger exists from the first run).
SELECT set_config('sakay.internal_context', 'true', true);
INSERT INTO public.system_policy_config (config_key, config_value, description)
VALUES (
    'strike_accrual_paused',
    '{"paused": false, "scope": "ALL", "pause_id": null}'::jsonb,
    'Emergency switch (Rules 15.4, 29.6): LGU Administrator may pause strike accrual platform-wide. Written only by set_strike_accrual_pause().'
)
ON CONFLICT (config_key) DO NOTHING;
SELECT set_config('sakay.internal_context', '', true);

-- ----------------------------------------------------------------------------
-- 5. TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.violation_catalog (
    violation_code VARCHAR(60) PRIMARY KEY,
    applies_to VARCHAR(20) NOT NULL CHECK (applies_to IN ('passenger', 'driver')),
    description TEXT NOT NULL,
    source_rule VARCHAR(80) NOT NULL,
    default_points INTEGER NOT NULL CHECK (default_points >= 0),
    min_points INTEGER NOT NULL CHECK (min_points >= 0),
    max_points INTEGER NOT NULL,
    confirmation_mode VARCHAR(30) NOT NULL
        CHECK (confirmation_mode IN ('AUTOMATIC', 'UPHELD_REPORT', 'ADMIN_CONFIRMATION')),
    event_category VARCHAR(30) NOT NULL,
    exemption_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    provisional_by_default BOOLEAN NOT NULL DEFAULT FALSE,
    pausable BOOLEAN NOT NULL DEFAULT FALSE,
    repeat_min_occurrences INTEGER NOT NULL DEFAULT 1 CHECK (repeat_min_occurrences >= 1),
    ladder_bypass VARCHAR(40) NOT NULL DEFAULT 'NONE'
        CHECK (ladder_bypass IN ('NONE', 'SUSPEND_PENDING_INVESTIGATION', 'DEACTIVATE_FOR_REVIEW', 'ADMIN_REVIEW_ONLY')),
    review_flag_type VARCHAR(100),
    rules_note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT violation_catalog_points_range
        CHECK (min_points <= default_points AND default_points <= max_points)
);

CREATE TABLE IF NOT EXISTS public.strikes_ledger (
    strike_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('passenger', 'driver')),
    subject_id UUID NOT NULL,
    violation_code VARCHAR(60) NOT NULL REFERENCES public.violation_catalog(violation_code),
    source_rule VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'PROVISIONAL', 'WAIVED', 'PARTIALLY_WAIVED', 'VOIDED', 'OBSERVED', 'AUTO_WAIVED')),
    points_issued INTEGER NOT NULL CHECK (points_issued >= 0),
    points_active INTEGER NOT NULL CHECK (points_active >= 0),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    provisional_until TIMESTAMPTZ,
    booking_id UUID REFERENCES public.booking(booking_id) ON DELETE SET NULL,
    incident_id UUID REFERENCES public.incident_report(incident_id) ON DELETE SET NULL,
    toda_id UUID REFERENCES public.toda(toda_id) ON DELETE SET NULL,   -- snapshot at issuance (PI-B5)
    reason TEXT,
    details JSONB,
    exempt_reason VARCHAR(40),
    pause_id UUID,
    idempotency_key TEXT,
    issued_by UUID,
    issued_by_role VARCHAR(30),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_strikes_ledger_idempotency
    ON public.strikes_ledger (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strikes_ledger_subject
    ON public.strikes_ledger (subject_type, subject_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_strikes_ledger_provisional
    ON public.strikes_ledger (provisional_until) WHERE status = 'PROVISIONAL';

CREATE TABLE IF NOT EXISTS public.exemption_request (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strike_id UUID NOT NULL REFERENCES public.strikes_ledger(strike_id) ON DELETE CASCADE,
    subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('passenger', 'driver')),
    subject_id UUID NOT NULL,
    toda_id UUID REFERENCES public.toda(toda_id) ON DELETE SET NULL,
    cause_code VARCHAR(40) NOT NULL
        CHECK (cause_code IN ('FORCE_MAJEURE', 'VEHICLE_BREAKDOWN', 'NETWORK_OUTAGE', 'MEDICAL_EMERGENCY',
                              'ACCIDENT_DOCUMENTED', 'DEVICE_FAILURE', 'OTHER')),
    justification TEXT NOT NULL CHECK (length(btrim(justification)) > 0),
    evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    toda_is_party BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending TODA Review'
        CHECK (status IN ('Pending TODA Review', 'Pending LGU Review', 'Full Waiver', 'Partial Waiver', 'Denied')),
    assigned_role VARCHAR(20) NOT NULL CHECK (assigned_role IN ('toda_admin', 'lgu_admin')),
    escalation_reason TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    requested_by UUID,
    decision_due_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ,
    decided_by UUID,
    decided_by_role VARCHAR(20),
    decision_reason TEXT,
    points_waived INTEGER,
    auto_denied BOOLEAN NOT NULL DEFAULT FALSE
);

-- At most one open request per strike
CREATE UNIQUE INDEX IF NOT EXISTS uq_exemption_request_open_per_strike
    ON public.exemption_request (strike_id)
    WHERE status IN ('Pending TODA Review', 'Pending LGU Review');
CREATE INDEX IF NOT EXISTS idx_exemption_request_queue
    ON public.exemption_request (assigned_role, status, requested_at);
CREATE INDEX IF NOT EXISTS idx_exemption_request_subject_cause
    ON public.exemption_request (subject_type, subject_id, cause_code, requested_at DESC);

-- ----------------------------------------------------------------------------
-- 6. VIOLATION CATALOG SEED (matrix compiled in the Batch 3 prompt)
-- ----------------------------------------------------------------------------
-- Columns: code, applies_to, description, source_rule, default/min/max points,
-- confirmation_mode, event_category, exemption_eligible, provisional_by_default,
-- pausable, repeat_min_occurrences, ladder_bypass, review_flag_type, rules_note.
-- UNDEFINED counts use the figures approved in decision D2 (F3.8).

INSERT INTO public.violation_catalog
    (violation_code, applies_to, description, source_rule, default_points, min_points, max_points,
     confirmation_mode, event_category, exemption_eligible, provisional_by_default, pausable,
     repeat_min_occurrences, ladder_bypass, review_flag_type, rules_note)
VALUES
    -- PASSENGER (Section 20) ---------------------------------------------------
    ('PAX_LATE_CANCEL', 'passenger', 'Late cancellation after driver assignment', 'Rule 12.2',
        1, 1, 1, 'AUTOMATIC', 'CANCELLATION', TRUE, FALSE, TRUE, 1, 'NONE', NULL,
        'Batch 8 defines what counts as late. System cancellations never strike the passenger (Rule 12.6).'),
    ('PAX_NO_SHOW', 'passenger', 'No-show at pickup (driver-tapped, system-verified)', 'Rule 10.4',
        2, 2, 2, 'AUTOMATIC', 'NO_SHOW', TRUE, FALSE, TRUE, 1, 'NONE', NULL, 'Batch 8 wires the trigger.'),
    ('PAX_UNDER_DECLARED_COUNT', 'passenger', 'Under-declared shared-trip passenger count', 'Rule 14.7',
        1, 1, 2, 'ADMIN_CONFIRMATION', 'FARE', TRUE, FALSE, FALSE, 1, 'NONE', NULL,
        '1-2 strikes depending on severity. Batch 10 wires the trigger.'),
    ('PAX_UNFOUNDED_DISPUTE', 'passenger', 'Bad-faith or repeatedly unfounded fare dispute after administrative review', 'Rule 18.4',
        1, 1, 1, 'ADMIN_CONFIRMATION', 'FARE', TRUE, FALSE, FALSE, 1, 'NONE', NULL, 'Batch 9 wires the trigger.'),
    ('PAX_ABUSIVE_UPHELD', 'passenger', 'Confirmed rude/abusive behavior toward a driver (upheld incident report)', 'Section 20',
        2, 2, 2, 'UPHELD_REPORT', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL, 'Batch 11 wires the trigger.'),
    ('PAX_FABRICATED_REPORT', 'passenger', 'Fabricated or malicious incident report', 'Rule 19.5',
        2, 2, 2, 'ADMIN_CONFIRMATION', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL, 'Batch 11 wires the trigger.'),
    ('PAX_FARE_AVOIDANCE', 'passenger', 'Confirmed abusive early-termination fare-avoidance pattern', 'Rule 13.6',
        1, 1, 1, 'ADMIN_CONFIRMATION', 'FARE', TRUE, FALSE, FALSE, 1, 'NONE', NULL, 'Subject to review; 1 strike if confirmed.'),
    ('PAX_REFUSAL_TO_PAY', 'passenger', 'Refusal to pay confirmed fare without upheld dispute', 'Rule 18.6',
        2, 2, 2, 'ADMIN_CONFIRMATION', 'FARE', TRUE, FALSE, FALSE, 1, 'NONE', NULL, 'Batch 9 wires the trigger.'),
    ('PAX_DEST_CHANGE_ABUSE', 'passenger', 'Repeated requests for unsupported destination changes to avoid fare obligations', 'Section 20 / PI-03',
        1, 1, 1, 'AUTOMATIC', 'FARE', TRUE, FALSE, FALSE, 2, 'NONE', NULL, 'Strike on the 2nd occurrence within 30 days (PI-B3).'),
    ('PAX_WRONG_PICKUP', 'passenger', 'Intentionally incorrect pickup location causing repeated driver delays', 'Section 20',
        1, 1, 1, 'ADMIN_CONFIRMATION', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL, NULL),
    ('PAX_REPEATED_ABUSIVE_LANGUAGE', 'passenger', 'Repeated abusive language toward drivers', 'Section 20',
        2, 2, 2, 'ADMIN_CONFIRMATION', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL, NULL),
    ('PAX_BOOKING_ABUSE', 'passenger', 'Booking abuse confirmed after administrative review', 'Rule 12.9 / PI-09(g)',
        2, 2, 2, 'ADMIN_CONFIRMATION', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL,
        'Count approved in D2. Detection raises a review flag; no automatic strike.'),
    ('PAX_VEHICLE_DAMAGE', 'passenger', 'Confirmed vehicle damage', 'Rule 29.15 / PI-09(h)',
        3, 3, 3, 'ADMIN_CONFIRMATION', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL, 'Count approved in D2.'),
    ('PAX_CONTAMINATION', 'passenger', 'Confirmed vehicle contamination', 'Rule 29.16 / PI-09(h)',
        1, 1, 1, 'ADMIN_CONFIRMATION', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL, 'Count approved in D2.'),
    ('PAX_MULTI_ACCOUNT', 'passenger', 'Multiple accounts used to evade sanctions', 'Rules 27.3, 27.6',
        0, 0, 0, 'ADMIN_CONFIRMATION', 'INTEGRITY', FALSE, FALSE, FALSE, 1, 'DEACTIVATE_FOR_REVIEW', NULL,
        'Permanent closure is decided by the LGU Administrator. Batch 12 wires the trigger.'),
    ('PAX_COLLUSIVE_MATCH', 'passenger', 'Collusive shared-trip matching', 'Rule 27.4',
        0, 0, 0, 'ADMIN_CONFIRMATION', 'INTEGRITY', FALSE, FALSE, FALSE, 1, 'DEACTIVATE_FOR_REVIEW', NULL,
        'Deactivation of both parties. Batch 12 wires the trigger.'),
    -- DRIVER (Section 21) ------------------------------------------------------
    ('DRV_STALL', 'driver', 'Stall / failure to proceed to pickup (approach phase only, PI-05)', 'Rule 8.3',
        1, 1, 1, 'AUTOMATIC', 'STALL', TRUE, FALSE, TRUE, 1, 'NONE', NULL, 'Batch 7 wires the trigger.'),
    ('DRV_PICKUP_DEVIATION', 'driver', 'Repeated intentional deviation from the pickup route', 'Rule 8.7 / Section 21',
        1, 1, 1, 'AUTOMATIC', 'CONDUCT', TRUE, FALSE, FALSE, 2, 'NONE', NULL,
        'Count approved in D2. Strike on the 2nd occurrence within 30 days (PI-B3).'),
    ('DRV_CONNECTIVITY_FAILURE', 'driver', 'Unexempted connectivity/availability failure (provisional strike)', 'Rules 9.3-9.5',
        1, 1, 1, 'AUTOMATIC', 'CONNECTIVITY', TRUE, TRUE, TRUE, 1, 'NONE', NULL,
        'Provisional until the exemption window closes without a request.'),
    ('DRV_DELIBERATE_OFFLINE', 'driver', 'Deliberate mid-trip offline', 'Rule 9.6',
        2, 2, 2, 'AUTOMATIC', 'CONNECTIVITY', FALSE, FALSE, FALSE, 1, 'NONE', NULL, 'Not eligible for exemption (Rule 9.6).'),
    ('DRV_GPS_DISABLED', 'driver', 'Deliberately disabling GPS while responding to an active booking', 'Section 21',
        0, 0, 0, 'AUTOMATIC', 'INTEGRITY', FALSE, FALSE, FALSE, 1, 'ADMIN_REVIEW_ONLY', 'GPS_DISABLED_DURING_BOOKING',
        'Immediate administrative review; no strike points.'),
    ('DRV_CANCEL_BEFORE_TRAVEL', 'driver', 'Cancellation before traveling', 'Rule 12.3',
        1, 1, 1, 'AUTOMATIC', 'CANCELLATION', TRUE, FALSE, TRUE, 1, 'NONE', NULL, 'Batch 8 wires the trigger.'),
    ('DRV_CANCEL_EN_ROUTE', 'driver', 'Cancellation while en route', 'Rule 12.4',
        2, 2, 2, 'AUTOMATIC', 'CANCELLATION', TRUE, FALSE, TRUE, 1, 'NONE', NULL, 'Batch 8 wires the trigger.'),
    ('DRV_QUEUE_CONFLICT', 'driver', 'Queue conflict violation (per confirmed instance)', 'Rule 5.3',
        1, 1, 1, 'ADMIN_CONFIRMATION', 'QUEUE', TRUE, FALSE, FALSE, 1, 'NONE', NULL, 'Batch 4 wires the trigger.'),
    ('DRV_AVAILABILITY_VIOLATION', 'driver', 'Availability violation (per confirmed instance)', 'Rule 5.7',
        1, 1, 1, 'ADMIN_CONFIRMATION', 'AVAILABILITY', TRUE, FALSE, TRUE, 1, 'NONE', NULL, 'Count approved in D2.'),
    ('DRV_OVERCHARGING', 'driver', 'Overcharging attempt / off-platform payment demand', 'Rules 6.4, 18.5',
        2, 2, 2, 'ADMIN_CONFIRMATION', 'FARE', TRUE, FALSE, FALSE, 1, 'NONE', NULL,
        'PI-09(b): policy text cites 18.4; intended 18.5. Major Offense under City Ordinance No. 118 s.21.4.'),
    ('DRV_UNSAFE_DRIVING', 'driver', 'Confirmed unsafe/reckless driving (upheld incident report)', 'Section 21',
        2, 2, 3, 'UPHELD_REPORT', 'SAFETY', TRUE, FALSE, FALSE, 1, 'NONE', NULL, '2-3 strikes by severity. Severe cases may be escalated manually.'),
    ('DRV_RUDE_UPHELD', 'driver', 'Confirmed rude behavior (upheld incident report)', 'Section 21',
        1, 1, 2, 'UPHELD_REPORT', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL, NULL),
    ('DRV_ROUTE_DEVIATION_FARE', 'driver', 'Intentional route deviation that increases distance or fare without valid reason', 'Section 21',
        1, 1, 1, 'ADMIN_CONFIRMATION', 'FARE', TRUE, FALSE, FALSE, 1, 'NONE', NULL, NULL),
    ('DRV_EARLY_STOP', 'driver', 'Driver-initiated early stop without valid safety/mechanical reason', 'Rule 13.7',
        1, 1, 2, 'ADMIN_CONFIRMATION', 'FARE', TRUE, FALSE, FALSE, 1, 'NONE', NULL, NULL),
    ('DRV_REPEATED_REFUSAL', 'driver', 'Repeated unjustified refusal to transport assigned passengers', 'Rules 7.9, 14.3',
        2, 2, 2, 'ADMIN_CONFIRMATION', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL,
        'Prompt matrix: only after TODA Administrator confirmation (rule text not in the Batch 3 paste).'),
    ('DRV_OFF_PLATFORM_PASSENGER', 'driver', 'Knowingly transporting another passenger outside SAKAY after accepting a booking', 'Section 21',
        2, 2, 2, 'ADMIN_CONFIRMATION', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL, NULL),
    ('DRV_FABRICATED_REPORT', 'driver', 'Fabricated report against a passenger (strike on the reporter)', 'Rule 19.5 (by analogy)',
        2, 2, 2, 'ADMIN_CONFIRMATION', 'CONDUCT', TRUE, FALSE, FALSE, 1, 'NONE', NULL,
        'ASSUMPTION: count mirrors the passenger rule (2). Not stated for drivers in the Batch 3 paste.'),
    ('DRV_COLLUSIVE_MATCH', 'driver', 'Collusive shared-trip matching', 'Rule 27.4',
        0, 0, 0, 'ADMIN_CONFIRMATION', 'INTEGRITY', FALSE, FALSE, FALSE, 1, 'DEACTIVATE_FOR_REVIEW', NULL,
        'Deactivation of both parties. Batch 12 wires the trigger.'),
    -- IMMEDIATE ESCALATION (Section 21): skip the ladder, suspend pending investigation
    ('DRV_PHYSICAL_ALTERCATION', 'driver', 'Confirmed physical altercation', 'Section 21',
        0, 0, 0, 'ADMIN_CONFIRMATION', 'SAFETY', FALSE, FALSE, FALSE, 1, 'SUSPEND_PENDING_INVESTIGATION', NULL, NULL),
    ('DRV_HARASSMENT', 'driver', 'Confirmed harassment', 'Section 21',
        0, 0, 0, 'ADMIN_CONFIRMATION', 'SAFETY', FALSE, FALSE, FALSE, 1, 'SUSPEND_PENDING_INVESTIGATION', NULL, NULL),
    ('DRV_DUI', 'driver', 'Driving under the influence', 'Section 21',
        0, 0, 0, 'ADMIN_CONFIRMATION', 'SAFETY', FALSE, FALSE, FALSE, 1, 'SUSPEND_PENDING_INVESTIGATION', NULL, NULL),
    ('DRV_SUBSTITUTE_DRIVER', 'driver', 'Unlicensed/unaccredited substitution of the actual driver', 'Section 21',
        0, 0, 0, 'ADMIN_CONFIRMATION', 'INTEGRITY', FALSE, FALSE, FALSE, 1, 'SUSPEND_PENDING_INVESTIGATION', NULL, NULL),
    ('DRV_GPS_SPOOFING', 'driver', 'GPS spoofing to falsify location or trip distance', 'Section 21',
        0, 0, 0, 'ADMIN_CONFIRMATION', 'INTEGRITY', FALSE, FALSE, FALSE, 1, 'SUSPEND_PENDING_INVESTIGATION', NULL, NULL)
ON CONFLICT (violation_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- True for the service role, or inside a policy-engine function that set the
-- internal context flag.
CREATE OR REPLACE FUNCTION public.is_service_context()
RETURNS BOOLEAN AS $$
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
    RETURN v_role = 'service_role' OR current_setting('sakay.internal_context', true) = 'true';
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, pg_temp;

-- Authoritative restriction state for a passenger or driver. Evaluated live
-- against the clock, so an expired suspension never blocks even if the sweep
-- has not yet restored account_status.
CREATE OR REPLACE FUNCTION public.account_restriction_state(p_subject_type TEXT, p_subject_id UUID)
RETURNS JSONB AS $$
DECLARE
    v RECORD;
    v_kind TEXT;
BEGIN
    IF p_subject_id IS NULL THEN
        RETURN jsonb_build_object('restricted', FALSE);
    END IF;

    IF p_subject_type = 'passenger' THEN
        SELECT account_status, suspended_until, suspension_kind, deactivated_at, closed_at, suspension_reason
          INTO v FROM public.passenger WHERE passenger_id = p_subject_id;
    ELSIF p_subject_type = 'driver' THEN
        SELECT account_status, suspended_until, suspension_kind, deactivated_at, closed_at, suspension_reason
          INTO v FROM public.driver WHERE driver_id = p_subject_id;
    ELSE
        RAISE EXCEPTION 'Unknown subject type %', p_subject_type;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('restricted', FALSE);
    END IF;

    IF v.closed_at IS NOT NULL THEN
        v_kind := 'CLOSED';
    ELSIF v.deactivated_at IS NOT NULL OR v.account_status = 'Deactivated' THEN
        v_kind := 'DEACTIVATED';
    ELSIF v.suspension_kind = 'INVESTIGATION' THEN
        v_kind := 'INVESTIGATION';
    ELSIF v.suspended_until IS NOT NULL AND v.suspended_until > CURRENT_TIMESTAMP THEN
        v_kind := 'SUSPENDED';
    ELSIF v.account_status = 'Suspended' AND v.suspension_kind IS NULL AND v.suspended_until IS NULL THEN
        v_kind := 'SUSPENDED';   -- legacy row written outside the engine
    END IF;

    RETURN jsonb_build_object(
        'restricted', v_kind IS NOT NULL,
        'kind', v_kind,
        'until', v.suspended_until,
        'reason', v.suspension_reason
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Active strike total: sum of unwaived points issued inside the rolling window.
CREATE OR REPLACE FUNCTION public.get_active_strike_count(p_subject_type TEXT, p_subject_id UUID)
RETURNS INTEGER AS $$
    SELECT COALESCE(SUM(points_active), 0)::INTEGER
    FROM public.strikes_ledger
    WHERE subject_type = p_subject_type
      AND subject_id = p_subject_id
      AND status IN ('ACTIVE', 'PROVISIONAL', 'PARTIALLY_WAIVED')
      AND issued_at > CURRENT_TIMESTAMP - make_interval(days => public.strike_policy_constant('window_days'));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Business days are Monday-Friday in Asia/Manila (no holiday calendar in v1).
CREATE OR REPLACE FUNCTION public.add_business_days(p_from TIMESTAMPTZ, p_days INTEGER)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_local TIMESTAMP := p_from AT TIME ZONE 'Asia/Manila';
    v_left INTEGER := p_days;
BEGIN
    WHILE v_left > 0 LOOP
        v_local := v_local + INTERVAL '1 day';
        IF EXTRACT(ISODOW FROM v_local) < 6 THEN
            v_left := v_left - 1;
        END IF;
    END LOOP;
    RETURN v_local AT TIME ZONE 'Asia/Manila';
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

-- Single audit writer for policy actions (Ground Rule 8). Actor is derived
-- from the caller; engine/system calls are recorded with role 'system'.
CREATE OR REPLACE FUNCTION public.record_policy_audit(
    p_action_type TEXT,
    p_target_id TEXT,
    p_target_name TEXT,
    p_category TEXT,
    p_details TEXT,
    p_before JSONB DEFAULT NULL,
    p_after JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_uid UUID;
    v_lgu UUID;
    v_toda UUID;
    v_role TEXT := 'system';
BEGIN
    BEGIN
        v_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_uid := NULL;
    END;

    IF v_uid IS NOT NULL THEN
        SELECT admin_id INTO v_lgu FROM public.lgu_admin WHERE auth_user_id = v_uid AND account_status = 'Active';
        IF v_lgu IS NOT NULL THEN
            v_role := 'lgu_admin';
        ELSE
            SELECT admin_id INTO v_toda FROM public.toda_admin WHERE auth_user_id = v_uid AND account_status = 'Active';
            IF v_toda IS NOT NULL THEN
                v_role := 'toda_admin';
            ELSIF EXISTS (SELECT 1 FROM public.driver WHERE auth_user_id = v_uid) THEN
                v_role := 'driver';
            ELSIF EXISTS (SELECT 1 FROM public.passenger WHERE auth_user_id = v_uid) THEN
                v_role := 'passenger';
            END IF;
        END IF;
    END IF;

    INSERT INTO public.audit_log (
        action_type, target_id, target_name, category, details,
        before_state, after_state, actor_id, actor_role, lgu_admin_id, toda_admin_id, performed_at
    ) VALUES (
        p_action_type, p_target_id, p_target_name, p_category, p_details,
        p_before, p_after, v_uid, v_role, v_lgu, v_toda, CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 8. protect_read_only_columns: strike / suspension / deactivation columns
-- ----------------------------------------------------------------------------
-- Copied from the Batch 1 definition, with ONE addition at the top: on
-- passenger and driver, the strike and suspension state may only be written by
-- the policy engine (internal context) or the service role. This deliberately
-- excludes LGU administrators writing the columns directly; they must use the
-- audited RPCs.

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

    -- Batch 3: strike / suspension / deactivation state is engine-only.
    IF TG_TABLE_NAME IN ('passenger', 'driver') THEN
        IF NOT (v_role = 'service_role' OR current_setting('sakay.internal_context', true) = 'true') THEN
            IF NEW.strikes_count IS DISTINCT FROM OLD.strikes_count
               OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
               OR NEW.suspension_kind IS DISTINCT FROM OLD.suspension_kind
               OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
               OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
               OR NEW.suspension_trigger_strike_id IS DISTINCT FROM OLD.suspension_trigger_strike_id
               OR NEW.suspension_threshold IS DISTINCT FROM OLD.suspension_threshold
               OR NEW.deactivated_at IS DISTINCT FROM OLD.deactivated_at
               OR NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
                RAISE EXCEPTION 'Access Denied: Strike, suspension and deactivation state can only be changed by the policy engine.';
            END IF;
        END IF;
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

-- The pause switch is written only by set_strike_accrual_pause().
CREATE OR REPLACE FUNCTION public.protect_strike_pause_config()
RETURNS TRIGGER AS $$
DECLARE
    v_key TEXT := COALESCE(NEW.config_key, OLD.config_key);
BEGIN
    IF v_key = 'strike_accrual_paused' AND NOT public.is_service_context() THEN
        RAISE EXCEPTION 'Access Denied: strike_accrual_paused can only be changed through set_strike_accrual_pause().';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_protect_strike_pause_config ON public.system_policy_config;
CREATE TRIGGER trigger_protect_strike_pause_config
    BEFORE INSERT OR UPDATE OR DELETE ON public.system_policy_config
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_strike_pause_config();

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (read-only for clients; all writes via functions)
-- ----------------------------------------------------------------------------

ALTER TABLE public.violation_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strikes_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exemption_request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "violation_catalog_select" ON public.violation_catalog;
CREATE POLICY "violation_catalog_select" ON public.violation_catalog
    FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "strikes_ledger_select" ON public.strikes_ledger;
CREATE POLICY "strikes_ledger_select" ON public.strikes_ledger
    FOR SELECT TO authenticated
    USING (
        (subject_type = 'passenger' AND subject_id = public.get_current_passenger_id())
        OR (subject_type = 'driver' AND subject_id = public.get_current_driver_id())
        OR public.is_lgu_admin()
        OR (public.is_toda_admin() AND toda_id = public.get_current_toda_admin_toda_id())
    );

DROP POLICY IF EXISTS "exemption_request_select" ON public.exemption_request;
CREATE POLICY "exemption_request_select" ON public.exemption_request
    FOR SELECT TO authenticated
    USING (
        (subject_type = 'passenger' AND subject_id = public.get_current_passenger_id())
        OR (subject_type = 'driver' AND subject_id = public.get_current_driver_id())
        OR public.is_lgu_admin()
        OR (public.is_toda_admin() AND toda_id = public.get_current_toda_admin_toda_id())
    );

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.violation_catalog FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.strikes_ledger FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.exemption_request FROM anon, authenticated;
REVOKE SELECT ON public.violation_catalog, public.strikes_ledger, public.exemption_request FROM anon;

-- Internal helpers are not callable from the client.
REVOKE EXECUTE ON FUNCTION public.account_restriction_state(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_active_strike_count(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_policy_audit(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_restriction_state(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_strike_count(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_policy_audit(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO service_role;
