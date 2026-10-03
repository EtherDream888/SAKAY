-- ============================================================================
-- Migration: 20261004000002_batch3_strike_engine.sql
-- Batch 3 (Step 2): The canonical strike engine.
--
--   1. Shared admin review flag mechanism: open the flag_type vocabulary, add
--      passenger subjects, fix TODA row scoping, add create/resolve functions.
--   2. Internal helpers (notify, suspend, deactivate, lift).
--   3. issue_strike(): idempotent, locks the subject row, honours the emergency
--      pause and exemption categories, sums the 90-day ledger, evaluates the
--      ladder (1 warning / 3 review / 5 -> 3-day / 8 -> 7-day / 10 deactivation),
--      updates the profile and writes audit_log.
--   4. Administrative account actions (suspend, reinstate, close) and the
--      emergency pause switch.
--   5. Read helpers for the apps (own restriction, strike history).
--   6. The existing passenger-cancellation trigger, re-pointed to the engine.
--
-- Ladder (Sections 20/21) with approved overrides: 3-day suspension at 5
-- strikes, 7-day suspension at 8 strikes (decision F3.3).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SHARED ADMIN REVIEW FLAG MECHANISM
-- ----------------------------------------------------------------------------
-- Batch 1 created admin_review_flag with a closed list of flag types. Every
-- later batch needs flags, so the type becomes an open, validated vocabulary.

DO $$
DECLARE
    v_con RECORD;
BEGIN
    FOR v_con IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.admin_review_flag'::regclass
          AND contype = 'c'
          AND (pg_get_constraintdef(oid) LIKE '%flag_type%' OR pg_get_constraintdef(oid) LIKE '%subject_type%')
    LOOP
        EXECUTE format('ALTER TABLE public.admin_review_flag DROP CONSTRAINT %I', v_con.conname);
    END LOOP;
END $$;

ALTER TABLE public.admin_review_flag
    ADD CONSTRAINT admin_review_flag_flag_type_format CHECK (flag_type ~ '^[A-Z][A-Z0-9_]*$');
ALTER TABLE public.admin_review_flag
    ADD CONSTRAINT admin_review_flag_subject_type_check
    CHECK (subject_type IN ('toda', 'driver_application', 'driver', 'passenger'));

-- TODA administrators see flags for their own TODA, their own drivers and their
-- own affiliation applications only (the Batch 1 policy matched toda ids only).
DROP POLICY IF EXISTS "admin_review_flag_select" ON public.admin_review_flag;
CREATE POLICY "admin_review_flag_select" ON public.admin_review_flag
    FOR SELECT TO authenticated
    USING (
        public.is_lgu_admin()
        OR (
            assigned_role = 'toda_admin'
            AND public.is_toda_admin()
            AND (
                subject_id = public.get_current_toda_admin_toda_id()::TEXT
                OR (subject_type = 'driver' AND EXISTS (
                    SELECT 1 FROM public.driver d
                    WHERE d.driver_id::TEXT = admin_review_flag.subject_id
                      AND d.toda_id = public.get_current_toda_admin_toda_id()))
                OR (subject_type = 'driver_application' AND EXISTS (
                    SELECT 1 FROM public.driver_toda_affiliation a
                    WHERE a.affiliation_id::TEXT = admin_review_flag.subject_id
                      AND a.toda_id = public.get_current_toda_admin_toda_id()))
            )
        )
    );

-- Create (or return the already-open) review flag. Other batches call this.
CREATE OR REPLACE FUNCTION public.create_admin_review_flag(
    p_flag_type TEXT,
    p_subject_type TEXT,
    p_subject_id TEXT,
    p_source_rule TEXT,
    p_assigned_role TEXT,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_my_toda UUID;
BEGIN
    IF NOT public.is_service_context() AND NOT public.is_lgu_admin() THEN
        IF public.is_toda_admin() THEN
            v_my_toda := public.get_current_toda_admin_toda_id();
            IF p_subject_type <> 'driver' OR NOT EXISTS (
                SELECT 1 FROM public.driver d WHERE d.driver_id::TEXT = p_subject_id AND d.toda_id = v_my_toda
            ) THEN
                RAISE EXCEPTION 'Access Denied: TODA administrators can only flag drivers of their own TODA.';
            END IF;
        ELSE
            RAISE EXCEPTION 'Access Denied: Only administrators or the system can create review flags.';
        END IF;
    END IF;

    INSERT INTO public.admin_review_flag (flag_type, subject_type, subject_id, source_rule, assigned_role, details)
    VALUES (p_flag_type, p_subject_type, p_subject_id, p_source_rule, p_assigned_role, p_details)
    ON CONFLICT (subject_type, subject_id, flag_type) WHERE status IN ('Open', 'Under Review') DO NOTHING
    RETURNING flag_id INTO v_id;

    IF v_id IS NULL THEN
        SELECT flag_id INTO v_id FROM public.admin_review_flag
        WHERE subject_type = p_subject_type AND subject_id = p_subject_id AND flag_type = p_flag_type
          AND status IN ('Open', 'Under Review')
        LIMIT 1;
    ELSE
        PERFORM public.record_policy_audit(
            'ADMIN_REVIEW_FLAG_CREATED', p_subject_id, NULL, 'Review Flags',
            'Created ' || p_flag_type || ' review flag (' || p_source_rule || '), assigned to ' || p_assigned_role || '.',
            NULL, jsonb_build_object('flag_id', v_id, 'flag_type', p_flag_type, 'details', p_details)
        );
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Resolve or dismiss a flag. Records the reviewer and an audit entry.
CREATE OR REPLACE FUNCTION public.resolve_admin_review_flag(
    p_flag_id UUID,
    p_status TEXT,
    p_resolution TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_flag public.admin_review_flag;
    v_visible BOOLEAN;
BEGIN
    IF p_status NOT IN ('Resolved', 'Dismissed', 'Under Review') THEN
        RAISE EXCEPTION 'Invalid flag status %', p_status;
    END IF;
    IF p_status <> 'Under Review' AND (p_resolution IS NULL OR length(btrim(p_resolution)) = 0) THEN
        RAISE EXCEPTION 'A resolution note is required.';
    END IF;

    SELECT * INTO v_flag FROM public.admin_review_flag WHERE flag_id = p_flag_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Review flag not found.';
    END IF;

    v_visible := public.is_lgu_admin();
    IF NOT v_visible AND public.is_toda_admin() AND v_flag.assigned_role = 'toda_admin' THEN
        v_visible := v_flag.subject_id = public.get_current_toda_admin_toda_id()::TEXT
            OR (v_flag.subject_type = 'driver' AND EXISTS (
                SELECT 1 FROM public.driver d
                WHERE d.driver_id::TEXT = v_flag.subject_id AND d.toda_id = public.get_current_toda_admin_toda_id()))
            OR (v_flag.subject_type = 'driver_application' AND EXISTS (
                SELECT 1 FROM public.driver_toda_affiliation a
                WHERE a.affiliation_id::TEXT = v_flag.subject_id AND a.toda_id = public.get_current_toda_admin_toda_id()));
    END IF;
    IF NOT v_visible THEN
        RAISE EXCEPTION 'Access Denied: This review flag is not assigned to you.';
    END IF;

    UPDATE public.admin_review_flag
    SET status = p_status,
        resolution = COALESCE(NULLIF(btrim(p_resolution), ''), resolution),
        resolved_by = CASE WHEN p_status = 'Under Review' THEN NULL ELSE auth.uid() END,
        resolved_at = CASE WHEN p_status = 'Under Review' THEN NULL ELSE CURRENT_TIMESTAMP END
    WHERE flag_id = p_flag_id;

    PERFORM public.record_policy_audit(
        'ADMIN_REVIEW_FLAG_' || upper(replace(p_status, ' ', '_')), v_flag.subject_id, NULL, 'Review Flags',
        'Review flag ' || v_flag.flag_type || ' set to ' || p_status || '. ' || COALESCE(p_resolution, ''),
        to_jsonb(v_flag), jsonb_build_object('status', p_status, 'resolution', p_resolution)
    );
    RETURN jsonb_build_object('success', TRUE, 'flag_id', p_flag_id, 'status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 2. INTERNAL HELPERS (not callable from clients)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._subject_name(p_type TEXT, p_id UUID)
RETURNS TEXT AS $$
    SELECT CASE
        WHEN p_type = 'passenger' THEN (SELECT full_name FROM public.passenger WHERE passenger_id = p_id)
        ELSE (SELECT full_name FROM public.driver WHERE driver_id = p_id)
    END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public._notify_subject(
    p_type TEXT, p_id UUID, p_notification_type TEXT, p_title TEXT, p_message TEXT,
    p_ref TEXT DEFAULT NULL, p_threshold INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notification (
        recipient_id, passenger_id, driver_id, title, message, notification_type, subject_id, threshold_days, sent_at
    ) VALUES (
        p_id::TEXT,
        CASE WHEN p_type = 'passenger' THEN p_id END,
        CASE WHEN p_type = 'driver' THEN p_id END,
        p_title, p_message, p_notification_type, p_ref, p_threshold, CURRENT_TIMESTAMP
    )
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Manila-formatted timestamp for notices (storage stays UTC).
CREATE OR REPLACE FUNCTION public._fmt_manila(p_ts TIMESTAMPTZ)
RETURNS TEXT AS $$
    SELECT to_char(p_ts AT TIME ZONE 'Asia/Manila', 'Mon DD, YYYY HH12:MI AM') || ' (PHT)';
$$ LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp;

-- Apply a suspension. Open-ended (INVESTIGATION) suspensions stay open-ended;
-- a time-bound suspension may only be extended, never shortened, here (22.1).
-- A deactivated account keeps its deactivated status. Returns the effective end.
CREATE OR REPLACE FUNCTION public._apply_suspension(
    p_type TEXT, p_id UUID, p_until TIMESTAMPTZ, p_kind TEXT, p_reason TEXT,
    p_strike_id UUID DEFAULT NULL, p_threshold INTEGER DEFAULT NULL
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_prev TEXT := current_setting('sakay.internal_context', true);
    v_ex_until TIMESTAMPTZ;
    v_ex_kind TEXT;
    v_ex_at TIMESTAMPTZ;
    v_until TIMESTAMPTZ;
    v_kind TEXT := p_kind;
BEGIN
    PERFORM set_config('sakay.internal_context', 'true', true);

    IF p_type = 'passenger' THEN
        SELECT suspended_until, suspension_kind, suspended_at INTO v_ex_until, v_ex_kind, v_ex_at
        FROM public.passenger WHERE passenger_id = p_id;
    ELSE
        SELECT suspended_until, suspension_kind, suspended_at INTO v_ex_until, v_ex_kind, v_ex_at
        FROM public.driver WHERE driver_id = p_id;
    END IF;

    IF v_kind = 'INVESTIGATION' OR v_ex_kind = 'INVESTIGATION' THEN
        v_until := NULL;
        v_kind := 'INVESTIGATION';
    ELSE
        v_until := GREATEST(COALESCE(v_ex_until, p_until), p_until);
    END IF;

    IF p_type = 'passenger' THEN
        UPDATE public.passenger
        SET account_status = CASE WHEN account_status = 'Deactivated' THEN account_status ELSE 'Suspended' END,
            suspended_until = v_until,
            suspension_kind = v_kind,
            suspended_at = COALESCE(v_ex_at, CURRENT_TIMESTAMP),
            suspension_reason = p_reason,
            suspension_trigger_strike_id = COALESCE(p_strike_id, suspension_trigger_strike_id),
            suspension_threshold = COALESCE(p_threshold, suspension_threshold)
        WHERE passenger_id = p_id;
    ELSE
        UPDATE public.driver
        SET account_status = CASE WHEN account_status = 'Deactivated' THEN account_status ELSE 'Suspended' END,
            suspended_until = v_until,
            suspension_kind = v_kind,
            suspended_at = COALESCE(v_ex_at, CURRENT_TIMESTAMP),
            suspension_reason = p_reason,
            suspension_trigger_strike_id = COALESCE(p_strike_id, suspension_trigger_strike_id),
            suspension_threshold = COALESCE(p_threshold, suspension_threshold)
        WHERE driver_id = p_id;
        -- Do not interrupt an active trip ('Busy'); the online-eligibility trigger
        -- forces the driver offline when the trip completes.
        UPDATE public.driver SET availability_status = 'Offline'
        WHERE driver_id = p_id AND availability_status = 'Available';
    END IF;

    PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
    RETURN v_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Deactivate (22.2): never auto-lifts; restored only by an administrator.
CREATE OR REPLACE FUNCTION public._apply_deactivation(p_type TEXT, p_id UUID, p_reason TEXT, p_strike_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_prev TEXT := current_setting('sakay.internal_context', true);
BEGIN
    PERFORM set_config('sakay.internal_context', 'true', true);
    IF p_type = 'passenger' THEN
        UPDATE public.passenger
        SET account_status = 'Deactivated', deactivated_at = COALESCE(deactivated_at, CURRENT_TIMESTAMP),
            suspended_until = NULL, suspension_kind = NULL,
            suspended_at = COALESCE(suspended_at, CURRENT_TIMESTAMP), suspension_reason = p_reason,
            suspension_trigger_strike_id = COALESCE(p_strike_id, suspension_trigger_strike_id)
        WHERE passenger_id = p_id;
    ELSE
        UPDATE public.driver
        SET account_status = 'Deactivated', deactivated_at = COALESCE(deactivated_at, CURRENT_TIMESTAMP),
            suspended_until = NULL, suspension_kind = NULL,
            suspended_at = COALESCE(suspended_at, CURRENT_TIMESTAMP), suspension_reason = p_reason,
            suspension_trigger_strike_id = COALESCE(p_strike_id, suspension_trigger_strike_id)
        WHERE driver_id = p_id;
        UPDATE public.driver SET availability_status = 'Offline'
        WHERE driver_id = p_id AND availability_status = 'Available';
    END IF;
    PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Clear suspension (and, when asked, deactivation) state and restore the
-- account to its normal status. Strike counts are never touched (22.4).
CREATE OR REPLACE FUNCTION public._clear_restriction(p_type TEXT, p_id UUID, p_include_deactivation BOOLEAN)
RETURNS VOID AS $$
DECLARE
    v_prev TEXT := current_setting('sakay.internal_context', true);
BEGIN
    PERFORM set_config('sakay.internal_context', 'true', true);
    IF p_type = 'passenger' THEN
        UPDATE public.passenger
        SET account_status = CASE
                WHEN account_status = 'Suspended' OR (p_include_deactivation AND account_status = 'Deactivated') THEN 'Active'
                ELSE account_status END,
            suspended_until = NULL, suspension_kind = NULL, suspended_at = NULL, suspension_reason = NULL,
            suspension_trigger_strike_id = NULL, suspension_threshold = NULL,
            deactivated_at = CASE WHEN p_include_deactivation THEN NULL ELSE deactivated_at END
        WHERE passenger_id = p_id;
    ELSE
        UPDATE public.driver
        SET account_status = CASE
                WHEN account_status = 'Suspended' OR (p_include_deactivation AND account_status = 'Deactivated') THEN 'Verified'
                ELSE account_status END,
            suspended_until = NULL, suspension_kind = NULL, suspended_at = NULL, suspension_reason = NULL,
            suspension_trigger_strike_id = NULL, suspension_threshold = NULL,
            deactivated_at = CASE WHEN p_include_deactivation THEN NULL ELSE deactivated_at END
        WHERE driver_id = p_id;
    END IF;
    PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Lift ONE subject's time-bound suspension if its period has ended (22.1).
-- Atomic and idempotent: a second call finds nothing to lift.
CREATE OR REPLACE FUNCTION public._lift_expired_suspension(p_type TEXT, p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_prev TEXT := current_setting('sakay.internal_context', true);
    v_n INTEGER;
    v_before JSONB;
BEGIN
    PERFORM set_config('sakay.internal_context', 'true', true);
    v_before := public.account_restriction_state(p_type, p_id);

    IF p_type = 'passenger' THEN
        UPDATE public.passenger
        SET account_status = CASE WHEN account_status = 'Suspended' THEN 'Active' ELSE account_status END,
            suspended_until = NULL, suspension_kind = NULL, suspended_at = NULL, suspension_reason = NULL,
            suspension_trigger_strike_id = NULL, suspension_threshold = NULL
        WHERE passenger_id = p_id AND suspension_kind IN ('LADDER', 'ADMIN')
          AND suspended_until IS NOT NULL AND suspended_until <= CURRENT_TIMESTAMP
          AND deactivated_at IS NULL AND closed_at IS NULL;
    ELSE
        UPDATE public.driver
        SET account_status = CASE WHEN account_status = 'Suspended' THEN 'Verified' ELSE account_status END,
            suspended_until = NULL, suspension_kind = NULL, suspended_at = NULL, suspension_reason = NULL,
            suspension_trigger_strike_id = NULL, suspension_threshold = NULL
        WHERE driver_id = p_id AND suspension_kind IN ('LADDER', 'ADMIN')
          AND suspended_until IS NOT NULL AND suspended_until <= CURRENT_TIMESTAMP
          AND deactivated_at IS NULL AND closed_at IS NULL;
    END IF;
    GET DIAGNOSTICS v_n = ROW_COUNT;

    IF v_n > 0 THEN
        PERFORM public.record_policy_audit(
            'ACCOUNT_SUSPENSION_ENDED', p_id::TEXT, public._subject_name(p_type, p_id), 'Strikes & Suspensions',
            'Suspension period ended; account restored automatically.',
            v_before, public.account_restriction_state(p_type, p_id));
        PERFORM public._notify_subject(p_type, p_id, 'SUSPENSION_ENDED',
            'Tapos na ang Suspensyon ng Iyong Account',
            'Maaari ka nang gumamit muli ng SAKAY. (Your suspension has ended; you can use SAKAY again.)',
            to_char(CURRENT_DATE, 'YYYYMMDD'), NULL);
    END IF;

    PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
    RETURN v_n > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 3. THE ENGINE: issue_strike
-- ----------------------------------------------------------------------------
-- Other batches call this (never write strikes directly). Authorized callers:
-- the service role / engine context, LGU administrators, and TODA administrators
-- for drivers of their own TODA (confirmation-based violations only).
--
-- p_exempt_reason (Rules 15.3, 15.5, 26.4): when set, the event is recorded as
-- AUTO_WAIVED with zero points. The caller is responsible for the verification.

CREATE OR REPLACE FUNCTION public.issue_strike(
    p_subject_type TEXT,
    p_subject_id UUID,
    p_violation_code TEXT,
    p_points INTEGER DEFAULT NULL,
    p_booking_id UUID DEFAULT NULL,
    p_incident_id UUID DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_provisional BOOLEAN DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_exempt_reason TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_prev TEXT := current_setting('sakay.internal_context', true);
    v_cat public.violation_catalog;
    v_existing public.strikes_ledger;
    v_row public.strikes_ledger;
    v_is_service BOOLEAN := public.is_service_context();
    v_is_lgu BOOLEAN := public.is_lgu_admin();
    v_actor UUID := auth.uid();
    v_actor_role TEXT;
    v_name TEXT;
    v_toda UUID;
    v_points INTEGER;
    v_cfg JSONB;
    v_scope TEXT;
    v_pause_id UUID;
    v_prior INTEGER;
    v_mode TEXT := 'NORMAL';
    v_status TEXT;
    v_active INTEGER;
    v_provisional BOOLEAN;
    v_strike_id UUID;
    v_before INTEGER;
    v_after INTEGER;
    v_state_before JSONB;
    v_state_after JSONB;
    v_crossed INTEGER := 0;
    v_t_warn INTEGER := public.strike_policy_constant('warning_threshold');
    v_t_review INTEGER := public.strike_policy_constant('review_threshold');
    v_t_s1 INTEGER := public.strike_policy_constant('suspension_1_threshold');
    v_t_s2 INTEGER := public.strike_policy_constant('suspension_2_threshold');
    v_t_deact INTEGER := public.strike_policy_constant('deactivation_threshold');
    v_consequence TEXT := NULL;
    v_until TIMESTAMPTZ;
    v_days INTEGER;
    v_flag_role TEXT;
    v_title TEXT;
    v_msg TEXT;
BEGIN
    IF p_subject_type NOT IN ('passenger', 'driver') THEN
        RAISE EXCEPTION 'Unknown subject type %', p_subject_type;
    END IF;

    SELECT * INTO v_cat FROM public.violation_catalog
    WHERE violation_code = p_violation_code AND is_active;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown or inactive violation code %', p_violation_code;
    END IF;
    IF v_cat.applies_to <> p_subject_type THEN
        RAISE EXCEPTION 'Violation % applies to %, not %', p_violation_code, v_cat.applies_to, p_subject_type;
    END IF;

    -- Lock the subject row: concurrent strikes for one account are serialized.
    IF p_subject_type = 'passenger' THEN
        SELECT full_name, NULL::UUID INTO v_name, v_toda FROM public.passenger WHERE passenger_id = p_subject_id FOR UPDATE;
    ELSE
        SELECT full_name, toda_id INTO v_name, v_toda FROM public.driver WHERE driver_id = p_subject_id FOR UPDATE;
    END IF;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subject not found';
    END IF;

    -- Authorization
    IF v_is_service THEN
        v_actor_role := 'system';
    ELSIF v_is_lgu THEN
        v_actor_role := 'lgu_admin';
    ELSIF public.is_toda_admin() AND p_subject_type = 'driver'
          AND v_toda IS NOT NULL AND v_toda = public.get_current_toda_admin_toda_id()
          AND v_cat.confirmation_mode <> 'AUTOMATIC' THEN
        v_actor_role := 'toda_admin';
    ELSE
        RAISE EXCEPTION 'Access Denied: You are not allowed to issue this strike.';
    END IF;

    -- Idempotency: a repeated call with the same key changes nothing.
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing FROM public.strikes_ledger WHERE idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN jsonb_build_object('success', TRUE, 'idempotent', TRUE,
                'strike_id', v_existing.strike_id, 'status', v_existing.status);
        END IF;
    END IF;

    IF v_cat.confirmation_mode = 'ADMIN_CONFIRMATION' AND (p_reason IS NULL OR length(btrim(p_reason)) = 0) THEN
        RAISE EXCEPTION 'A confirmation reason is required for % (administrator-confirmed violation).', p_violation_code;
    END IF;

    v_points := COALESCE(p_points, v_cat.default_points);
    IF v_points < v_cat.min_points OR v_points > v_cat.max_points THEN
        RAISE EXCEPTION 'Points % are outside the allowed range % to % for %',
            v_points, v_cat.min_points, v_cat.max_points, p_violation_code;
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    v_before := public.get_active_strike_count(p_subject_type, p_subject_id);
    v_state_before := public.account_restriction_state(p_subject_type, p_subject_id);

    -- Decide how this event is recorded ------------------------------------
    v_cfg := (SELECT config_value FROM public.system_policy_config WHERE config_key = 'strike_accrual_paused');
    v_scope := COALESCE(v_cfg->>'scope', 'ALL');

    IF p_exempt_reason IS NOT NULL THEN
        IF p_exempt_reason NOT IN ('SAFETY_INCIDENT_VICTIM', 'TRAFFIC_ACCIDENT', 'FORCE_MAJEURE') THEN
            RAISE EXCEPTION 'Unknown exempt reason %', p_exempt_reason;
        END IF;
        IF p_exempt_reason = 'TRAFFIC_ACCIDENT' AND p_subject_type <> 'driver' THEN
            RAISE EXCEPTION 'TRAFFIC_ACCIDENT applies to drivers only (Rule 15.5).';
        END IF;
        v_mode := 'EXEMPT';
    ELSIF COALESCE((v_cfg->>'paused')::BOOLEAN, FALSE) AND v_cat.pausable
          AND (v_scope = 'ALL' OR (v_scope = 'CANCEL_STALL_NOSHOW' AND v_cat.event_category IN ('CANCELLATION', 'STALL', 'NO_SHOW'))) THEN
        v_mode := 'PAUSED';
        v_pause_id := NULLIF(v_cfg->>'pause_id', '')::UUID;
    ELSIF v_cat.repeat_min_occurrences > 1 THEN
        SELECT COUNT(*) INTO v_prior FROM public.strikes_ledger
        WHERE subject_type = p_subject_type AND subject_id = p_subject_id AND violation_code = p_violation_code
          AND status <> 'VOIDED'
          AND issued_at > CURRENT_TIMESTAMP - make_interval(days => public.strike_policy_constant('repeat_violation_window_days'));
        IF v_prior + 1 < v_cat.repeat_min_occurrences THEN
            v_mode := 'OBSERVED';
        END IF;
    END IF;

    IF v_mode = 'NORMAL' AND v_cat.ladder_bypass <> 'NONE' THEN
        v_mode := 'BYPASS';
    END IF;

    v_provisional := COALESCE(p_provisional, v_cat.provisional_by_default) AND v_cat.exemption_eligible AND v_points > 0;

    v_status := CASE v_mode
        WHEN 'EXEMPT' THEN 'AUTO_WAIVED'
        WHEN 'PAUSED' THEN 'AUTO_WAIVED'
        WHEN 'OBSERVED' THEN 'OBSERVED'
        WHEN 'BYPASS' THEN 'ACTIVE'
        WHEN 'NORMAL' THEN CASE WHEN v_provisional THEN 'PROVISIONAL' ELSE 'ACTIVE' END
    END;
    v_active := CASE WHEN v_mode = 'NORMAL' THEN v_points ELSE 0 END;

    IF p_subject_type = 'driver' THEN
        v_flag_role := CASE WHEN v_cat.ladder_bypass = 'ADMIN_REVIEW_ONLY' THEN 'toda_admin' ELSE 'lgu_admin' END;
    ELSE
        v_flag_role := 'lgu_admin';
    END IF;

    INSERT INTO public.strikes_ledger (
        subject_type, subject_id, violation_code, source_rule, status, points_issued, points_active,
        provisional_until, booking_id, incident_id, toda_id, reason, details, exempt_reason, pause_id,
        idempotency_key, issued_by, issued_by_role
    ) VALUES (
        p_subject_type, p_subject_id, p_violation_code, v_cat.source_rule, v_status,
        CASE WHEN v_mode = 'BYPASS' THEN 0 ELSE v_points END, v_active,
        CASE WHEN v_status = 'PROVISIONAL'
             THEN CURRENT_TIMESTAMP + make_interval(hours => public.strike_policy_constant('exemption_window_hours')) END,
        p_booking_id, p_incident_id, v_toda, p_reason, p_details, p_exempt_reason, v_pause_id,
        p_idempotency_key, v_actor, v_actor_role
    ) RETURNING * INTO v_row;
    v_strike_id := v_row.strike_id;

    -- Non-counting outcomes: recorded, nothing else changes ----------------
    IF v_mode IN ('PAUSED', 'OBSERVED') THEN
        PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
        RETURN jsonb_build_object('success', TRUE, 'strike_id', v_strike_id, 'status', v_status,
            'paused', v_mode = 'PAUSED', 'observed', v_mode = 'OBSERVED', 'points', 0,
            'active_before', v_before, 'active_after', v_before);
    END IF;

    IF v_mode = 'EXEMPT' THEN
        PERFORM public.record_policy_audit('STRIKE_AUTO_WAIVED', p_subject_id::TEXT, v_name, 'Strikes & Suspensions',
            'Event ' || p_violation_code || ' recorded without a strike (' || p_exempt_reason || ').',
            jsonb_build_object('active_strikes', v_before), to_jsonb(v_row));
        PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
        RETURN jsonb_build_object('success', TRUE, 'strike_id', v_strike_id, 'status', v_status,
            'exempt', TRUE, 'points', 0, 'active_before', v_before, 'active_after', v_before);
    END IF;

    -- Ladder bypass (immediate escalation / review only) --------------------
    IF v_mode = 'BYPASS' THEN
        IF v_cat.ladder_bypass = 'SUSPEND_PENDING_INVESTIGATION' THEN
            PERFORM public._apply_suspension(p_subject_type, p_subject_id, NULL, 'INVESTIGATION',
                'Suspended pending investigation: ' || v_cat.description, v_strike_id, NULL);
            PERFORM public.create_admin_review_flag('IMMEDIATE_ESCALATION', p_subject_type, p_subject_id::TEXT,
                v_cat.source_rule, 'lgu_admin',
                jsonb_build_object('violation_code', p_violation_code, 'strike_id', v_strike_id, 'reason', p_reason));
            v_consequence := 'INVESTIGATION_SUSPENSION';
            v_title := 'Suspendido ang Iyong Account';
            v_msg := 'Pansamantalang sinuspinde ang iyong account habang iniimbestigahan ang: ' || v_cat.description ||
                     '. (Your account is suspended pending investigation.)';
        ELSIF v_cat.ladder_bypass = 'DEACTIVATE_FOR_REVIEW' THEN
            PERFORM public._apply_deactivation(p_subject_type, p_subject_id, 'Deactivated for review: ' || v_cat.description, v_strike_id);
            PERFORM public.create_admin_review_flag('DEACTIVATION_REVIEW', p_subject_type, p_subject_id::TEXT,
                v_cat.source_rule, 'lgu_admin',
                jsonb_build_object('violation_code', p_violation_code, 'strike_id', v_strike_id, 'reason', p_reason));
            v_consequence := 'DEACTIVATION';
            v_title := 'Na-deactivate ang Iyong Account';
            v_msg := 'Na-deactivate ang iyong account para sa pagsusuri: ' || v_cat.description ||
                     '. (Your account is deactivated pending administrator review.)';
        ELSE
            PERFORM public.create_admin_review_flag(COALESCE(v_cat.review_flag_type, 'IMMEDIATE_REVIEW'), p_subject_type,
                p_subject_id::TEXT, v_cat.source_rule, v_flag_role,
                jsonb_build_object('violation_code', p_violation_code, 'strike_id', v_strike_id, 'reason', p_reason));
            v_consequence := 'ADMIN_REVIEW';
        END IF;

        v_state_after := public.account_restriction_state(p_subject_type, p_subject_id);
        PERFORM public.record_policy_audit('STRIKE_ESCALATED', p_subject_id::TEXT, v_name, 'Strikes & Suspensions',
            p_violation_code || ' (' || v_cat.source_rule || ') bypassed the ladder: ' || v_consequence || '.',
            v_state_before, jsonb_build_object('restriction', v_state_after, 'strike', to_jsonb(v_row)));
        IF v_title IS NOT NULL THEN
            PERFORM public._notify_subject(p_subject_type, p_subject_id, 'ACCOUNT_RESTRICTION_NOTICE',
                v_title, v_msg, v_strike_id::TEXT, 0);
        END IF;
        PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
        RETURN jsonb_build_object('success', TRUE, 'strike_id', v_strike_id, 'status', v_status,
            'consequence', v_consequence, 'points', 0, 'active_before', v_before, 'active_after', v_before);
    END IF;

    -- Normal strike: evaluate the ladder ------------------------------------
    v_after := public.get_active_strike_count(p_subject_type, p_subject_id);

    IF p_subject_type = 'passenger' THEN
        UPDATE public.passenger SET strikes_count = v_after WHERE passenger_id = p_subject_id;
    ELSE
        UPDATE public.driver SET strikes_count = v_after WHERE driver_id = p_subject_id;
    END IF;

    IF v_before < v_t_warn   AND v_after >= v_t_warn   THEN v_crossed := v_t_warn;   END IF;
    IF v_before < v_t_review AND v_after >= v_t_review THEN v_crossed := v_t_review; END IF;
    IF v_before < v_t_s1     AND v_after >= v_t_s1     THEN v_crossed := v_t_s1;     END IF;
    IF v_before < v_t_s2     AND v_after >= v_t_s2     THEN v_crossed := v_t_s2;     END IF;
    IF v_before < v_t_deact  AND v_after >= v_t_deact  THEN v_crossed := v_t_deact;  END IF;

    IF v_after >= v_t_deact AND COALESCE(v_state_before->>'kind', '') NOT IN ('DEACTIVATED', 'CLOSED') THEN
        -- Top tier fires on crossing AND for a reinstated account still at/over the threshold.
        PERFORM public._apply_deactivation(p_subject_type, p_subject_id,
            v_after || ' active strikes within 90 days (' || p_violation_code || ')', v_strike_id);
        PERFORM public.create_admin_review_flag('DEACTIVATION_REVIEW', p_subject_type, p_subject_id::TEXT,
            'Sections 20/21', 'lgu_admin',
            jsonb_build_object('active_strikes', v_after, 'strike_id', v_strike_id));
        v_consequence := 'DEACTIVATION';
    ELSIF v_crossed >= v_t_s2 THEN
        v_days := public.strike_policy_constant('suspension_2_days');
        v_until := public._apply_suspension(p_subject_type, p_subject_id, CURRENT_TIMESTAMP + make_interval(days => v_days), 'LADDER',
            v_after || ' active strikes within 90 days (' || p_violation_code || ')', v_strike_id, v_t_s2);
        v_consequence := 'SUSPENSION';
    ELSIF v_crossed >= v_t_s1 THEN
        v_days := public.strike_policy_constant('suspension_1_days');
        v_until := public._apply_suspension(p_subject_type, p_subject_id, CURRENT_TIMESTAMP + make_interval(days => v_days), 'LADDER',
            v_after || ' active strikes within 90 days (' || p_violation_code || ')', v_strike_id, v_t_s1);
        v_consequence := 'SUSPENSION';
    ELSIF v_crossed >= v_t_review THEN
        v_consequence := 'ADMIN_REVIEW';
    ELSIF v_crossed >= v_t_warn THEN
        v_consequence := 'WARNING';
    END IF;

    -- Administrative review at 3 strikes (also raised when a larger jump crosses 3).
    IF v_before < v_t_review AND v_after >= v_t_review THEN
        PERFORM public.create_admin_review_flag('ADMIN_REVIEW_3_STRIKES', p_subject_type, p_subject_id::TEXT,
            'Sections 20/21', CASE WHEN p_subject_type = 'driver' THEN 'toda_admin' ELSE 'lgu_admin' END,
            jsonb_build_object('active_strikes', v_after, 'strike_id', v_strike_id));
    END IF;

    -- A new violation during a suspension is left to TODA/LGU discretion (22.1).
    IF v_points > 0 AND COALESCE(v_state_before->>'kind', '') IN ('SUSPENDED', 'INVESTIGATION') THEN
        PERFORM public.create_admin_review_flag('SUSPENSION_NEW_VIOLATION', p_subject_type, p_subject_id::TEXT,
            'Rule 22.1', 'lgu_admin',
            jsonb_build_object('violation_code', p_violation_code, 'strike_id', v_strike_id, 'active_strikes', v_after));
    END IF;

    v_state_after := public.account_restriction_state(p_subject_type, p_subject_id);

    PERFORM public.record_policy_audit('STRIKE_ISSUED', p_subject_id::TEXT, v_name, 'Strikes & Suspensions',
        'Issued ' || v_points || ' strike(s) for ' || p_violation_code || ' (' || v_cat.source_rule || '). Active strikes: '
            || v_before || ' -> ' || v_after || COALESCE('. Consequence: ' || v_consequence, '') || '. ' || COALESCE(p_reason, ''),
        jsonb_build_object('active_strikes', v_before, 'restriction', v_state_before),
        jsonb_build_object('active_strikes', v_after, 'restriction', v_state_after, 'strike', to_jsonb(v_row)));

    -- Notices (Abiso): one per strike, plus one for any restriction.
    v_title := CASE WHEN v_before < v_t_warn THEN 'Babala: May Strike sa Iyong Account' ELSE 'May Bagong Strike sa Iyong Account' END;
    v_msg := 'Nakatanggap ka ng ' || v_points || ' strike: ' || v_cat.description || '. Aktibong strike: ' || v_after ||
             '.' || CASE WHEN v_cat.exemption_eligible
                         THEN ' May ' || public.strike_policy_constant('exemption_window_hours') || ' oras ka para humiling ng exemption.' ELSE '' END ||
             ' (You received ' || v_points || ' strike(s). Active strikes: ' || v_after || '.)';
    PERFORM public._notify_subject(p_subject_type, p_subject_id, 'STRIKE_ISSUED', v_title, v_msg, v_strike_id::TEXT, 0);

    IF v_consequence = 'SUSPENSION' THEN
        PERFORM public._notify_subject(p_subject_type, p_subject_id, 'ACCOUNT_RESTRICTION_NOTICE',
            'Suspendido ang Iyong Account',
            'Suspendido ang iyong account hanggang ' || public._fmt_manila(v_until) || ' dahil sa ' || v_after ||
            ' aktibong strike. (Your account is suspended until ' || public._fmt_manila(v_until) || '.)',
            v_strike_id::TEXT, v_crossed);
    ELSIF v_consequence = 'DEACTIVATION' THEN
        PERFORM public._notify_subject(p_subject_type, p_subject_id, 'ACCOUNT_RESTRICTION_NOTICE',
            'Na-deactivate ang Iyong Account',
            'Na-deactivate ang iyong account dahil sa ' || v_after || ' aktibong strike. Susuriin ito ng LGU. ' ||
            '(Your account is deactivated pending LGU review.)',
            v_strike_id::TEXT, v_t_deact);
    END IF;

    PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
    RETURN jsonb_build_object(
        'success', TRUE, 'strike_id', v_strike_id, 'status', v_status, 'points', v_points,
        'active_before', v_before, 'active_after', v_after,
        'consequence', v_consequence, 'suspended_until', v_until, 'provisional', v_status = 'PROVISIONAL');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 4. ADMINISTRATIVE ACCOUNT ACTIONS (LGU Administrator)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_suspend_account(
    p_subject_type TEXT, p_subject_id UUID, p_days INTEGER, p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_before JSONB;
    v_until TIMESTAMPTZ;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only LGU Administrators can suspend accounts.';
    END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'A suspension reason is required.';
    END IF;
    IF p_days IS NOT NULL AND p_days <= 0 THEN
        RAISE EXCEPTION 'Suspension days must be positive, or NULL for an open-ended investigation suspension.';
    END IF;
    IF p_subject_type NOT IN ('passenger', 'driver') OR public._subject_name(p_subject_type, p_subject_id) IS NULL THEN
        RAISE EXCEPTION 'Subject not found';
    END IF;

    v_before := public.account_restriction_state(p_subject_type, p_subject_id);
    v_until := public._apply_suspension(
        p_subject_type, p_subject_id,
        CASE WHEN p_days IS NULL THEN NULL ELSE CURRENT_TIMESTAMP + make_interval(days => p_days) END,
        CASE WHEN p_days IS NULL THEN 'INVESTIGATION' ELSE 'ADMIN' END, p_reason);

    PERFORM public.record_policy_audit('ACCOUNT_SUSPENDED_BY_ADMIN', p_subject_id::TEXT,
        public._subject_name(p_subject_type, p_subject_id), 'Strikes & Suspensions',
        'Administrative suspension' || COALESCE(' for ' || p_days || ' day(s)', ' pending investigation') || '. Reason: ' || p_reason,
        v_before, public.account_restriction_state(p_subject_type, p_subject_id));
    PERFORM public._notify_subject(p_subject_type, p_subject_id, 'ACCOUNT_RESTRICTION_NOTICE',
        'Suspendido ang Iyong Account',
        CASE WHEN v_until IS NULL
             THEN 'Pansamantalang sinuspinde ang iyong account habang may imbestigasyon. (Suspended pending investigation.)'
             ELSE 'Suspendido ang iyong account hanggang ' || public._fmt_manila(v_until) || '. (Your account is suspended.)' END,
        gen_random_uuid()::TEXT, 0);
    RETURN jsonb_build_object('success', TRUE, 'suspended_until', v_until);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Reinstate a suspended or deactivated account. Deactivation requires the
-- administrator to confirm the full violation history was reviewed (22.2).
-- Strike counts are NOT reset (22.4).
CREATE OR REPLACE FUNCTION public.admin_reinstate_account(
    p_subject_type TEXT, p_subject_id UUID, p_reason TEXT, p_history_reviewed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_before JSONB;
    v_kind TEXT;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only LGU Administrators can reinstate accounts.';
    END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'A reinstatement reason is required.';
    END IF;
    IF p_subject_type NOT IN ('passenger', 'driver') OR public._subject_name(p_subject_type, p_subject_id) IS NULL THEN
        RAISE EXCEPTION 'Subject not found';
    END IF;

    v_before := public.account_restriction_state(p_subject_type, p_subject_id);
    v_kind := v_before->>'kind';
    IF v_kind = 'CLOSED' THEN
        RAISE EXCEPTION 'A permanently closed account cannot be reinstated.';
    END IF;
    IF v_kind = 'DEACTIVATED' AND NOT COALESCE(p_history_reviewed, FALSE) THEN
        RAISE EXCEPTION 'Confirm that the full violation history was reviewed before reactivating a deactivated account.';
    END IF;

    PERFORM public._clear_restriction(p_subject_type, p_subject_id, v_kind = 'DEACTIVATED');

    PERFORM public.record_policy_audit('ACCOUNT_REINSTATED', p_subject_id::TEXT,
        public._subject_name(p_subject_type, p_subject_id), 'Strikes & Suspensions',
        'Reinstated from ' || COALESCE(v_kind, 'no restriction') || '. History reviewed: ' || COALESCE(p_history_reviewed, FALSE) ||
        '. Strike count is retained and ages out normally. Reason: ' || p_reason,
        v_before, public.account_restriction_state(p_subject_type, p_subject_id));
    IF v_kind IS NOT NULL THEN
        PERFORM public._notify_subject(p_subject_type, p_subject_id, 'ACCOUNT_REINSTATED',
            'Naibalik ang Iyong Account',
            'Naibalik na ang iyong account. (Your account has been reinstated.)', gen_random_uuid()::TEXT, 0);
    END IF;
    RETURN jsonb_build_object('success', TRUE, 'previous_kind', v_kind);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.admin_close_account(
    p_subject_type TEXT, p_subject_id UUID, p_reason TEXT, p_history_reviewed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_before JSONB;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only LGU Administrators can permanently close accounts.';
    END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'A closure reason is required.';
    END IF;
    IF NOT COALESCE(p_history_reviewed, FALSE) THEN
        RAISE EXCEPTION 'Confirm that the full violation history was reviewed before permanently closing an account.';
    END IF;
    IF p_subject_type NOT IN ('passenger', 'driver') OR public._subject_name(p_subject_type, p_subject_id) IS NULL THEN
        RAISE EXCEPTION 'Subject not found';
    END IF;

    v_before := public.account_restriction_state(p_subject_type, p_subject_id);
    PERFORM public._apply_deactivation(p_subject_type, p_subject_id, 'Permanently closed: ' || p_reason);
    PERFORM set_config('sakay.internal_context', 'true', true);
    IF p_subject_type = 'passenger' THEN
        UPDATE public.passenger SET closed_at = COALESCE(closed_at, CURRENT_TIMESTAMP) WHERE passenger_id = p_subject_id;
    ELSE
        UPDATE public.driver SET closed_at = COALESCE(closed_at, CURRENT_TIMESTAMP) WHERE driver_id = p_subject_id;
    END IF;
    PERFORM set_config('sakay.internal_context', '', true);

    PERFORM public.record_policy_audit('ACCOUNT_PERMANENTLY_CLOSED', p_subject_id::TEXT,
        public._subject_name(p_subject_type, p_subject_id), 'Strikes & Suspensions',
        'Permanently closed after full history review. Reason: ' || p_reason,
        v_before, public.account_restriction_state(p_subject_type, p_subject_id));
    RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Emergency switch (Rules 15.4, 29.6): ONE administrative record, not case-by-case.
-- While paused, pausable violations are still recorded as events (AUTO_WAIVED,
-- zero points) so analytics keep them, but no strikes accrue.
CREATE OR REPLACE FUNCTION public.set_strike_accrual_pause(
    p_paused BOOLEAN, p_scope TEXT DEFAULT 'ALL', p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
    v_pause_id UUID;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only the LGU Administrator can pause strike accrual.';
    END IF;
    IF p_scope NOT IN ('ALL', 'CANCEL_STALL_NOSHOW') THEN
        RAISE EXCEPTION 'Scope must be ALL or CANCEL_STALL_NOSHOW.';
    END IF;
    IF p_paused AND (p_reason IS NULL OR length(btrim(p_reason)) = 0) THEN
        RAISE EXCEPTION 'A reason (declared emergency or calamity) is required to pause strike accrual.';
    END IF;

    SELECT config_value INTO v_old FROM public.system_policy_config WHERE config_key = 'strike_accrual_paused' FOR UPDATE;
    IF COALESCE((v_old->>'paused')::BOOLEAN, FALSE) = p_paused THEN
        RETURN jsonb_build_object('success', TRUE, 'unchanged', TRUE, 'state', v_old);
    END IF;

    v_pause_id := CASE WHEN p_paused THEN gen_random_uuid() ELSE NULLIF(v_old->>'pause_id', '')::UUID END;
    v_new := jsonb_build_object(
        'paused', p_paused, 'scope', p_scope, 'pause_id', v_pause_id,
        'reason', p_reason, 'declared_by', auth.uid(), 'changed_at', CURRENT_TIMESTAMP);

    PERFORM set_config('sakay.internal_context', 'true', true);
    UPDATE public.system_policy_config
    SET config_value = v_new, updated_at = CURRENT_TIMESTAMP, updated_by = auth.uid()
    WHERE config_key = 'strike_accrual_paused';
    PERFORM set_config('sakay.internal_context', '', true);

    PERFORM public.record_policy_audit(
        CASE WHEN p_paused THEN 'STRIKE_ACCRUAL_PAUSED' ELSE 'STRIKE_ACCRUAL_RESUMED' END,
        COALESCE(v_pause_id::TEXT, 'strike_accrual_paused'), NULL, 'Strikes & Suspensions',
        CASE WHEN p_paused THEN 'Strike accrual paused platform-wide (scope ' || p_scope || '). Reason: ' || p_reason
             ELSE 'Strike accrual resumed platform-wide.' END,
        v_old, v_new);
    RETURN jsonb_build_object('success', TRUE, 'state', v_new);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 5. READ HELPERS FOR THE APPS
-- ----------------------------------------------------------------------------

-- The signed-in user's own restriction. Lifts an expired suspension first, so a
-- user is never kept out by a sweep that has not run yet.
CREATE OR REPLACE FUNCTION public.get_my_account_restriction(p_role TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_type TEXT;
    v_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('found', FALSE, 'restricted', FALSE);
    END IF;

    IF p_role IS NULL OR p_role = 'passenger' THEN
        SELECT passenger_id INTO v_id FROM public.passenger WHERE auth_user_id = v_uid;
        IF v_id IS NOT NULL THEN v_type := 'passenger'; END IF;
    END IF;
    IF v_id IS NULL AND (p_role IS NULL OR p_role = 'driver') THEN
        SELECT driver_id INTO v_id FROM public.driver WHERE auth_user_id = v_uid;
        IF v_id IS NOT NULL THEN v_type := 'driver'; END IF;
    END IF;
    IF v_id IS NULL THEN
        RETURN jsonb_build_object('found', FALSE, 'restricted', FALSE);
    END IF;

    PERFORM public._lift_expired_suspension(v_type, v_id);
    RETURN public.account_restriction_state(v_type, v_id) || jsonb_build_object(
        'found', TRUE, 'subject_type', v_type, 'subject_id', v_id,
        'active_strikes', public.get_active_strike_count(v_type, v_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Strike history (ledger) for one account, newest first. Visible to the account
-- holder, the LGU, and a TODA administrator for their own drivers.
CREATE OR REPLACE FUNCTION public.get_strike_history(p_subject_type TEXT, p_subject_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_toda UUID;
    v_allowed BOOLEAN := FALSE;
BEGIN
    IF p_subject_type = 'passenger' THEN
        v_allowed := public.is_lgu_admin() OR public.get_current_passenger_id() = p_subject_id;
    ELSIF p_subject_type = 'driver' THEN
        SELECT toda_id INTO v_toda FROM public.driver WHERE driver_id = p_subject_id;
        v_allowed := public.is_lgu_admin() OR public.get_current_driver_id() = p_subject_id
                     OR (public.is_toda_admin() AND v_toda IS NOT NULL AND v_toda = public.get_current_toda_admin_toda_id());
    END IF;
    IF NOT v_allowed THEN
        RAISE EXCEPTION 'Access Denied: You cannot view this strike history.';
    END IF;

    RETURN jsonb_build_object(
        'active_strikes', public.get_active_strike_count(p_subject_type, p_subject_id),
        'window_days', public.strike_policy_constant('window_days'),
        'restriction', public.account_restriction_state(p_subject_type, p_subject_id),
        'strikes', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'strike_id', s.strike_id, 'violation_code', s.violation_code, 'description', c.description,
                'source_rule', s.source_rule, 'status', s.status, 'points_issued', s.points_issued,
                'points_active', s.points_active, 'issued_at', s.issued_at, 'provisional_until', s.provisional_until,
                'reason', s.reason, 'exempt_reason', s.exempt_reason, 'issued_by_role', s.issued_by_role,
                'in_window', s.issued_at > CURRENT_TIMESTAMP - make_interval(days => public.strike_policy_constant('window_days')))
                ORDER BY s.issued_at DESC)
            FROM public.strikes_ledger s JOIN public.violation_catalog c USING (violation_code)
            WHERE s.subject_type = p_subject_type AND s.subject_id = p_subject_id), '[]'::jsonb));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 6. PASSENGER-CANCELLATION TRIGGER, RE-POINTED TO THE ENGINE
-- ----------------------------------------------------------------------------
-- The PI-09 trigger already existed (and was removed in ..0001). It is restored
-- here on top of issue_strike. NOTE for Batch 8: the status names tested below
-- ('Assigned', 'Ongoing') are kept from the original trigger but no app code
-- writes them (apps write Accepted / In Transit / Trip Ongoing ...), so this
-- trigger does not fire today. Batch 8 owns the definition of a "late" cancel
-- (Rule 12.2) and must align the statuses. System cancellations never strike
-- the passenger (Rule 12.6): only cancelled_by = 'passenger' is considered.

CREATE OR REPLACE FUNCTION public.strike_on_passenger_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_status = 'Cancelled' AND OLD.booking_status IN ('Assigned', 'Ongoing')
       AND NEW.cancelled_by = 'passenger' AND NEW.passenger_id IS NOT NULL THEN
        PERFORM set_config('sakay.internal_context', 'true', true);
        PERFORM public.issue_strike(
            'passenger', NEW.passenger_id, 'PAX_LATE_CANCEL', NULL, NEW.booking_id, NULL,
            'PAX_LATE_CANCEL:' || NEW.booking_id::TEXT, NULL,
            COALESCE(NEW.cancellation_reason, 'Late cancellation after driver assignment'), NULL, NULL);
        PERFORM set_config('sakay.internal_context', '', true);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_strike_on_passenger_cancellation ON public.booking;
CREATE TRIGGER trigger_strike_on_passenger_cancellation
    AFTER UPDATE OF booking_status ON public.booking
    FOR EACH ROW
    WHEN (NEW.booking_status = 'Cancelled' AND OLD.booking_status IS DISTINCT FROM 'Cancelled')
    EXECUTE FUNCTION public.strike_on_passenger_cancellation();

-- ----------------------------------------------------------------------------
-- 7. PRIVILEGES
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public._subject_name(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._notify_subject(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._apply_suspension(TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._apply_deactivation(TEXT, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._clear_restriction(TEXT, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._lift_expired_suspension(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.strike_on_passenger_cancellation() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.issue_strike(TEXT, UUID, TEXT, INTEGER, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_suspend_account(TEXT, UUID, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reinstate_account(TEXT, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_close_account(TEXT, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_strike_accrual_pause(BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_admin_review_flag(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_admin_review_flag(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_account_restriction(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_strike_history(TEXT, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.issue_strike(TEXT, UUID, TEXT, INTEGER, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_suspend_account(TEXT, UUID, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reinstate_account(TEXT, UUID, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_close_account(TEXT, UUID, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_strike_accrual_pause(BOOLEAN, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_review_flag(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_admin_review_flag(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_account_restriction(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_strike_history(TEXT, UUID) TO authenticated, service_role;
