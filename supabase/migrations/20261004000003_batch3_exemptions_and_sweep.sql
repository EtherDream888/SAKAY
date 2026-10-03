-- ============================================================================
-- Migration: 20261004000003_batch3_exemptions_and_sweep.sql
-- Batch 3 (Step 2b): Exemption & appeal workflow (Section 25) and the sweep.
--
--   submit_exemption_request()   25.1-25.5, 25.7: 72 h window (decision D1),
--                                routing, repeated-cause denial (PI-B2).
--   decide_exemption()           25.6, 25.8: Full / Partial / Denied + audit.
--   escalate_exemption_request() TODA -> LGU escalation (25.4, PI-B9).
--   admin_void_strike()          canonical strike void (W1).
--   sweep_strike_state()         auto-lift, provisional conversion, count
--                                refresh, SLA-breach escalation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Re-evaluate an account after a strike was waived or voided.
-- Refreshes the cached total and, per PI-B8, lifts an ACTIVE ladder suspension
-- or dismisses the 3-strike review flag when the waiver removes the basis for it.
-- Deactivation is never lifted here: it stays a manual decision (22.2).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._reevaluate_after_waiver(p_type TEXT, p_id UUID, p_strike_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_prev TEXT := current_setting('sakay.internal_context', true);
    v_after INTEGER;
    v_trigger UUID;
    v_threshold INTEGER;
    v_kind TEXT;
    v_before_state JSONB;
    v_lifted BOOLEAN := FALSE;
    v_flag_dismissed BOOLEAN := FALSE;
BEGIN
    PERFORM set_config('sakay.internal_context', 'true', true);
    v_after := public.get_active_strike_count(p_type, p_id);

    IF p_type = 'passenger' THEN
        UPDATE public.passenger SET strikes_count = v_after WHERE passenger_id = p_id
        RETURNING suspension_trigger_strike_id, suspension_threshold, suspension_kind INTO v_trigger, v_threshold, v_kind;
    ELSE
        UPDATE public.driver SET strikes_count = v_after WHERE driver_id = p_id
        RETURNING suspension_trigger_strike_id, suspension_threshold, suspension_kind INTO v_trigger, v_threshold, v_kind;
    END IF;

    -- The waived strike caused the active suspension and the total is now below its threshold.
    IF v_kind = 'LADDER' AND v_trigger = p_strike_id AND v_threshold IS NOT NULL AND v_after < v_threshold THEN
        v_before_state := public.account_restriction_state(p_type, p_id);
        PERFORM public._clear_restriction(p_type, p_id, FALSE);
        PERFORM public.record_policy_audit('ACCOUNT_SUSPENSION_LIFTED_BY_WAIVER', p_id::TEXT, public._subject_name(p_type, p_id),
            'Strikes & Suspensions', 'Suspension lifted: the strike that triggered it was waived and the total fell to ' || v_after || '.',
            v_before_state, public.account_restriction_state(p_type, p_id));
        PERFORM public._notify_subject(p_type, p_id, 'SUSPENSION_ENDED', 'Naalis ang Suspensyon ng Iyong Account',
            'Inalis ang suspensyon dahil napagbigyan ang iyong exemption. (Suspension lifted after your exemption was granted.)',
            p_strike_id::TEXT, 1);
        v_lifted := TRUE;
    END IF;

    IF v_after < public.strike_policy_constant('review_threshold') THEN
        UPDATE public.admin_review_flag
        SET status = 'Dismissed', resolution = 'Auto-dismissed: active strikes fell below the review threshold after a waiver.',
            resolved_at = CURRENT_TIMESTAMP
        WHERE flag_type = 'ADMIN_REVIEW_3_STRIKES' AND subject_type = p_type AND subject_id = p_id::TEXT
          AND status IN ('Open', 'Under Review');
        v_flag_dismissed := FOUND;
    END IF;

    PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
    RETURN jsonb_build_object('active_strikes', v_after, 'suspension_lifted', v_lifted, 'review_flag_dismissed', v_flag_dismissed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- submit_exemption_request
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_exemption_request(
    p_strike_id UUID,
    p_cause_code TEXT,
    p_justification TEXT,
    p_evidence JSONB DEFAULT '[]'::jsonb,
    p_toda_is_party BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_strike public.strikes_ledger;
    v_cat public.violation_catalog;
    v_owner UUID;
    v_prior INTEGER;
    v_state JSONB;
    v_role TEXT;
    v_status TEXT;
    v_escalation TEXT;
    v_req public.exemption_request;
    v_window INTEGER := public.strike_policy_constant('exemption_window_hours');
    v_auto_denied BOOLEAN := FALSE;
BEGIN
    IF p_justification IS NULL OR length(btrim(p_justification)) = 0 THEN
        RAISE EXCEPTION 'A justification is required (Rule 25.2).';
    END IF;

    SELECT * INTO v_strike FROM public.strikes_ledger WHERE strike_id = p_strike_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Strike not found.';
    END IF;

    -- Only the account holder files a request for their own strike.
    IF v_strike.subject_type = 'passenger' THEN
        SELECT auth_user_id INTO v_owner FROM public.passenger WHERE passenger_id = v_strike.subject_id;
    ELSE
        SELECT auth_user_id INTO v_owner FROM public.driver WHERE driver_id = v_strike.subject_id;
    END IF;
    IF v_uid IS NULL OR v_owner IS DISTINCT FROM v_uid THEN
        RAISE EXCEPTION 'Access Denied: You can only request an exemption for your own strike.';
    END IF;

    SELECT * INTO v_cat FROM public.violation_catalog WHERE violation_code = v_strike.violation_code;
    IF NOT v_cat.exemption_eligible THEN
        RAISE EXCEPTION 'This violation is not eligible for exemption (%).', v_cat.source_rule;
    END IF;
    IF v_strike.status NOT IN ('ACTIVE', 'PROVISIONAL', 'PARTIALLY_WAIVED') OR v_strike.points_active <= 0 THEN
        RAISE EXCEPTION 'This strike is not open to exemption (status %).', v_strike.status;
    END IF;
    IF CURRENT_TIMESTAMP > v_strike.issued_at + make_interval(hours => v_window) THEN
        RAISE EXCEPTION 'The % hour window to request an exemption for this strike has passed (Rule 25.1).', v_window;
    END IF;
    IF EXISTS (SELECT 1 FROM public.exemption_request WHERE strike_id = p_strike_id
               AND status IN ('Pending TODA Review', 'Pending LGU Review')) THEN
        RAISE EXCEPTION 'An exemption request for this strike is already pending.';
    END IF;

    -- Rule 25.7 / PI-B2: the 3rd request on the same cause in 30 days is reviewed;
    -- from the 4th on, it is denied.
    SELECT COUNT(*) INTO v_prior FROM public.exemption_request
    WHERE subject_type = v_strike.subject_type AND subject_id = v_strike.subject_id AND cause_code = p_cause_code
      AND requested_at > CURRENT_TIMESTAMP - make_interval(days => public.strike_policy_constant('exemption_repeat_window_days'));

    -- Routing (25.4 / 25.5)
    v_state := public.account_restriction_state(v_strike.subject_type, v_strike.subject_id);
    IF v_strike.subject_type = 'passenger' THEN
        v_role := 'lgu_admin'; v_status := 'Pending LGU Review'; v_escalation := 'Passenger requests are reviewed by the LGU Administrator (25.5).';
    ELSIF COALESCE(p_toda_is_party, FALSE) THEN
        v_role := 'lgu_admin'; v_status := 'Pending LGU Review'; v_escalation := 'The TODA is a party to the dispute (25.4).';
    ELSIF COALESCE((v_state->>'restricted')::BOOLEAN, FALSE) OR v_cat.ladder_bypass <> 'NONE' THEN
        v_role := 'lgu_admin'; v_status := 'Pending LGU Review'; v_escalation := 'Suspension/deactivation-level consequence (25.4).';
    ELSE
        v_role := 'toda_admin'; v_status := 'Pending TODA Review';
    END IF;

    IF v_prior >= public.strike_policy_constant('exemption_repeat_limit') THEN
        v_auto_denied := TRUE;
        v_status := 'Denied';
    END IF;

    INSERT INTO public.exemption_request (
        strike_id, subject_type, subject_id, toda_id, cause_code, justification, evidence_urls, toda_is_party,
        status, assigned_role, escalation_reason, requested_by, decision_due_at, auto_denied,
        decided_at, decision_reason, decided_by_role, points_waived
    ) VALUES (
        p_strike_id, v_strike.subject_type, v_strike.subject_id, v_strike.toda_id, p_cause_code, p_justification,
        COALESCE(p_evidence, '[]'::jsonb), COALESCE(p_toda_is_party, FALSE),
        v_status, v_role, v_escalation, v_uid,
        public.add_business_days(CURRENT_TIMESTAMP, public.strike_policy_constant('exemption_decision_business_days')), v_auto_denied,
        CASE WHEN v_auto_denied THEN CURRENT_TIMESTAMP END,
        CASE WHEN v_auto_denied THEN 'Automatically denied: ' || (v_prior) || ' earlier requests citing the same cause within ' ||
             public.strike_policy_constant('exemption_repeat_window_days') || ' days (Rule 25.7).' END,
        CASE WHEN v_auto_denied THEN 'system' END,
        CASE WHEN v_auto_denied THEN 0 END
    ) RETURNING * INTO v_req;

    PERFORM public.record_policy_audit(
        CASE WHEN v_auto_denied THEN 'EXEMPTION_AUTO_DENIED' ELSE 'EXEMPTION_REQUESTED' END,
        v_strike.subject_id::TEXT, public._subject_name(v_strike.subject_type, v_strike.subject_id), 'Exemptions',
        'Exemption requested for ' || v_strike.violation_code || ' (cause ' || p_cause_code || '), routed to ' || v_role || '.',
        NULL, to_jsonb(v_req));

    RETURN jsonb_build_object('success', TRUE, 'request_id', v_req.request_id, 'status', v_req.status,
        'assigned_role', v_req.assigned_role, 'decision_due_at', v_req.decision_due_at, 'auto_denied', v_auto_denied);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- decide_exemption: Full Waiver / Partial Waiver / Denied (25.6, 25.8)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decide_exemption(
    p_request_id UUID,
    p_outcome TEXT,
    p_reason TEXT,
    p_points_to_waive INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_req public.exemption_request;
    v_strike public.strikes_ledger;
    v_role TEXT;
    v_waive INTEGER;
    v_new_status TEXT;
    v_prev TEXT := current_setting('sakay.internal_context', true);
    v_after JSONB;
    v_req_after public.exemption_request;
BEGIN
    IF p_outcome NOT IN ('FULL', 'PARTIAL', 'DENIED') THEN
        RAISE EXCEPTION 'Outcome must be FULL, PARTIAL or DENIED.';
    END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'A stated reason is required for every decision (Rule 25.6 / 25.8).';
    END IF;

    SELECT * INTO v_req FROM public.exemption_request WHERE request_id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Exemption request not found.';
    END IF;
    IF v_req.status NOT IN ('Pending TODA Review', 'Pending LGU Review') THEN
        RAISE EXCEPTION 'This request has already been decided (%).', v_req.status;
    END IF;

    -- Authority: LGU decides anything; a TODA admin only requests routed to their TODA.
    IF public.is_lgu_admin() THEN
        v_role := 'lgu_admin';
    ELSIF public.is_toda_admin() AND v_req.status = 'Pending TODA Review'
          AND v_req.toda_id IS NOT NULL AND v_req.toda_id = public.get_current_toda_admin_toda_id() THEN
        v_role := 'toda_admin';
    ELSE
        RAISE EXCEPTION 'Access Denied: This request is not assigned to you.';
    END IF;

    SELECT * INTO v_strike FROM public.strikes_ledger WHERE strike_id = v_req.strike_id FOR UPDATE;

    IF p_outcome = 'DENIED' THEN
        v_new_status := 'Denied'; v_waive := 0;
    ELSIF p_outcome = 'FULL' THEN
        v_new_status := 'Full Waiver'; v_waive := v_strike.points_active;
    ELSE
        v_waive := COALESCE(p_points_to_waive, 0);
        IF v_waive < 1 OR v_waive >= v_strike.points_active THEN
            RAISE EXCEPTION 'A partial waiver must remove at least 1 and fewer than all % active point(s).', v_strike.points_active;
        END IF;
        v_new_status := 'Partial Waiver';
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);
    IF p_outcome <> 'DENIED' THEN
        UPDATE public.strikes_ledger
        SET points_active = points_active - v_waive,
            status = CASE WHEN p_outcome = 'FULL' THEN 'WAIVED' ELSE 'PARTIALLY_WAIVED' END,
            resolved_at = CURRENT_TIMESTAMP, resolved_by = auth.uid(), resolution_reason = p_reason
        WHERE strike_id = v_strike.strike_id;
    ELSIF v_strike.status = 'PROVISIONAL' THEN
        -- A denied provisional strike is confirmed immediately.
        UPDATE public.strikes_ledger SET status = 'ACTIVE', provisional_until = NULL WHERE strike_id = v_strike.strike_id;
    END IF;

    UPDATE public.exemption_request
    SET status = v_new_status, decided_at = CURRENT_TIMESTAMP, decided_by = auth.uid(), decided_by_role = v_role,
        decision_reason = p_reason, points_waived = v_waive
    WHERE request_id = p_request_id
    RETURNING * INTO v_req_after;

    v_after := public._reevaluate_after_waiver(v_strike.subject_type, v_strike.subject_id, v_strike.strike_id);
    PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);

    PERFORM public.record_policy_audit('EXEMPTION_DECIDED', v_strike.subject_id::TEXT,
        public._subject_name(v_strike.subject_type, v_strike.subject_id), 'Exemptions',
        v_new_status || ' for ' || v_strike.violation_code || ' by ' || v_role || '. Rationale: ' || p_reason,
        to_jsonb(v_req), jsonb_build_object('request', to_jsonb(v_req_after), 'reevaluation', v_after));

    PERFORM public._notify_subject(v_strike.subject_type, v_strike.subject_id, 'EXEMPTION_DECISION',
        'Resulta ng Iyong Exemption Request',
        'Ang iyong exemption request ay: ' || v_new_status || '. Dahilan: ' || p_reason ||
        ' (Your exemption request outcome: ' || v_new_status || '.)', v_req.request_id::TEXT, 0);

    RETURN jsonb_build_object('success', TRUE, 'status', v_new_status, 'points_waived', v_waive, 'reevaluation', v_after);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- TODA administrator escalates a request to the LGU (25.4, PI-B9).
CREATE OR REPLACE FUNCTION public.escalate_exemption_request(p_request_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
    v_req public.exemption_request;
BEGIN
    IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'An escalation reason is required.';
    END IF;
    SELECT * INTO v_req FROM public.exemption_request WHERE request_id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Exemption request not found.';
    END IF;
    IF NOT (public.is_lgu_admin() OR (public.is_toda_admin() AND v_req.toda_id = public.get_current_toda_admin_toda_id())) THEN
        RAISE EXCEPTION 'Access Denied: This request is not assigned to you.';
    END IF;
    IF v_req.status <> 'Pending TODA Review' THEN
        RAISE EXCEPTION 'Only requests pending TODA review can be escalated.';
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);
    UPDATE public.exemption_request
    SET status = 'Pending LGU Review', assigned_role = 'lgu_admin', escalation_reason = p_reason
    WHERE request_id = p_request_id;
    PERFORM set_config('sakay.internal_context', '', true);

    PERFORM public.record_policy_audit('EXEMPTION_ESCALATED', v_req.subject_id::TEXT,
        public._subject_name(v_req.subject_type, v_req.subject_id), 'Exemptions',
        'Exemption request escalated to the LGU Administrator. Reason: ' || p_reason,
        to_jsonb(v_req), jsonb_build_object('status', 'Pending LGU Review'));
    RETURN jsonb_build_object('success', TRUE, 'status', 'Pending LGU Review');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- admin_void_strike: the one way to remove a strike (LGU Administrator)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_void_strike(p_strike_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
    v_strike public.strikes_ledger;
    v_prev TEXT := current_setting('sakay.internal_context', true);
    v_after JSONB;
BEGIN
    IF NOT public.is_lgu_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only LGU Administrators can void strikes.';
    END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'A reason is required to void a strike.';
    END IF;
    SELECT * INTO v_strike FROM public.strikes_ledger WHERE strike_id = p_strike_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Strike not found.';
    END IF;
    IF v_strike.status = 'VOIDED' THEN
        RETURN jsonb_build_object('success', TRUE, 'idempotent', TRUE);
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);
    UPDATE public.strikes_ledger
    SET status = 'VOIDED', points_active = 0, resolved_at = CURRENT_TIMESTAMP, resolved_by = auth.uid(), resolution_reason = p_reason
    WHERE strike_id = p_strike_id;
    UPDATE public.exemption_request
    SET status = 'Denied', decided_at = CURRENT_TIMESTAMP, decided_by = auth.uid(), decided_by_role = 'lgu_admin',
        decision_reason = 'Strike voided by administrator: ' || p_reason, points_waived = 0
    WHERE strike_id = p_strike_id AND status IN ('Pending TODA Review', 'Pending LGU Review');
    v_after := public._reevaluate_after_waiver(v_strike.subject_type, v_strike.subject_id, p_strike_id);
    PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);

    PERFORM public.record_policy_audit('STRIKE_VOIDED', v_strike.subject_id::TEXT,
        public._subject_name(v_strike.subject_type, v_strike.subject_id), 'Strikes & Suspensions',
        'Voided strike ' || v_strike.violation_code || '. Reason: ' || p_reason,
        to_jsonb(v_strike), jsonb_build_object('status', 'VOIDED', 'reevaluation', v_after));
    RETURN jsonb_build_object('success', TRUE, 'reevaluation', v_after);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- sweep_strike_state: run by the existing server scheduler (service role).
-- Idempotent; safe to run twice. Guards never depend on it for correctness
-- (they evaluate suspended_until live); it restores status, refreshes the
-- cached count after aging, converts provisional strikes, and escalates
-- exemption requests that missed the 3-business-day deadline.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sweep_strike_state()
RETURNS JSONB AS $$
DECLARE
    v_prev TEXT := current_setting('sakay.internal_context', true);
    r RECORD;
    v_lifted INTEGER := 0;
    v_converted INTEGER := 0;
    v_refreshed INTEGER := 0;
    v_escalated INTEGER := 0;
    v_count INTEGER;
BEGIN
    IF NOT public.is_service_context() THEN
        RAISE EXCEPTION 'Access Denied: The sweep runs as the service role only.';
    END IF;
    IF NOT pg_try_advisory_xact_lock(742902) THEN
        RETURN jsonb_build_object('skipped', TRUE);
    END IF;

    PERFORM set_config('sakay.internal_context', 'true', true);

    -- 1. Auto-lift expired time-bound suspensions
    FOR r IN
        SELECT 'passenger' AS t, passenger_id AS id FROM public.passenger
        WHERE suspension_kind IN ('LADDER', 'ADMIN') AND suspended_until <= CURRENT_TIMESTAMP
        UNION ALL
        SELECT 'driver', driver_id FROM public.driver
        WHERE suspension_kind IN ('LADDER', 'ADMIN') AND suspended_until <= CURRENT_TIMESTAMP
    LOOP
        IF public._lift_expired_suspension(r.t, r.id) THEN v_lifted := v_lifted + 1; END IF;
    END LOOP;

    -- 2. Provisional strikes whose window closed without a pending request become confirmed
    UPDATE public.strikes_ledger s
    SET status = 'ACTIVE', provisional_until = NULL
    WHERE s.status = 'PROVISIONAL' AND s.provisional_until <= CURRENT_TIMESTAMP
      AND NOT EXISTS (SELECT 1 FROM public.exemption_request e
                      WHERE e.strike_id = s.strike_id AND e.status IN ('Pending TODA Review', 'Pending LGU Review'));
    GET DIAGNOSTICS v_converted = ROW_COUNT;

    -- 3. Refresh the cached active total where it drifted (strikes aged out of the window)
    FOR r IN
        SELECT 'passenger' AS t, passenger_id AS id, strikes_count AS cached FROM public.passenger WHERE strikes_count > 0
        UNION ALL
        SELECT 'driver', driver_id, strikes_count FROM public.driver WHERE strikes_count > 0
    LOOP
        v_count := public.get_active_strike_count(r.t, r.id);
        IF v_count <> r.cached THEN
            IF r.t = 'passenger' THEN
                UPDATE public.passenger SET strikes_count = v_count WHERE passenger_id = r.id;
            ELSE
                UPDATE public.driver SET strikes_count = v_count WHERE driver_id = r.id;
            END IF;
            v_refreshed := v_refreshed + 1;
        END IF;
    END LOOP;

    -- 4. Exemption requests past the decision deadline escalate to the LGU (SLA breach)
    FOR r IN
        SELECT request_id, subject_type, subject_id FROM public.exemption_request
        WHERE status = 'Pending TODA Review' AND decision_due_at < CURRENT_TIMESTAMP
    LOOP
        UPDATE public.exemption_request
        SET status = 'Pending LGU Review', assigned_role = 'lgu_admin',
            escalation_reason = 'Escalated automatically: the TODA did not decide within the deadline (Rule 25.6).'
        WHERE request_id = r.request_id AND status = 'Pending TODA Review';
        PERFORM public.create_admin_review_flag('EXEMPTION_SLA_BREACH', r.subject_type, r.subject_id::TEXT, 'Rule 25.6', 'lgu_admin',
            jsonb_build_object('request_id', r.request_id));
        PERFORM public.record_policy_audit('EXEMPTION_ESCALATED', r.subject_id::TEXT, NULL, 'Exemptions',
            'Exemption request escalated to the LGU: decision deadline missed.', NULL, jsonb_build_object('request_id', r.request_id));
        v_escalated := v_escalated + 1;
    END LOOP;

    PERFORM set_config('sakay.internal_context', COALESCE(v_prev, ''), true);
    RETURN jsonb_build_object('lifted_suspensions', v_lifted, 'provisional_confirmed', v_converted,
        'counts_refreshed', v_refreshed, 'requests_escalated', v_escalated);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- PRIVILEGES
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public._reevaluate_after_waiver(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_exemption_request(UUID, TEXT, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decide_exemption(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.escalate_exemption_request(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_void_strike(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sweep_strike_state() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_exemption_request(UUID, TEXT, TEXT, JSONB, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_exemption(UUID, TEXT, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escalate_exemption_request(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_void_strike(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sweep_strike_state() TO service_role;
