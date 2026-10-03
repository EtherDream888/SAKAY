const { freshDb, asUser, attempt, check, summary } = require('../tlib');
const { ID, seed } = require('../fixtures');
const DAY = 86400000;

(async () => {
  const db = await freshDb('20261004000002_batch3_strike_engine.sql');
  await seed(db);
  const svc = (fn) => asUser(db, { role: 'service_role' }, fn, { commit: true });
  const lgu = (fn) => asUser(db, { uid: ID.L_AUTH }, fn, { commit: true });
  const strike = (type, id, code, key, extra = {}) => svc((tx) => attempt(async () => {
    const r = await tx.query(
      'SELECT public.issue_strike($1,$2,$3,$4,NULL,NULL,$5,$6,$7,$8,NULL) r',
      [type, id, code, extra.points ?? null, key ?? null, extra.prov ?? null, extra.reason ?? null, extra.exempt ?? null]);
    return r.rows[0].r;
  }));
  const row = async (type, id) => (await db.query(type === 'passenger'
    ? `SELECT account_status, strikes_count, suspended_until, suspension_kind, deactivated_at, suspension_threshold FROM passenger WHERE passenger_id='${id}'`
    : `SELECT account_status, availability_status, strikes_count, suspended_until, suspension_kind, deactivated_at, suspension_threshold FROM driver WHERE driver_id='${id}'`)).rows[0];
  const flags = async (id) => (await db.query(`SELECT flag_type, assigned_role, status FROM admin_review_flag WHERE subject_id='${id}' ORDER BY created_at`)).rows;
  const days = (ts) => (new Date(ts).getTime() - Date.now()) / DAY;
  const internal = (sql) => db.exec(`SELECT set_config('sakay.internal_context','true',false); ${sql}; SELECT set_config('sakay.internal_context','',false);`);

  // ===== T1: ladder for passenger and driver ================================
  for (const [type, id, code] of [['passenger', ID.P1, 'PAX_LATE_CANCEL'], ['driver', ID.D1, 'DRV_STALL']]) {
    console.log(`\nT1 ladder: ${type}`);
    if (type === 'driver') {
      // Fixture only: skip the Batch 1 affiliation check so the driver can start 'Available'.
      await db.exec(`ALTER TABLE public.driver DISABLE TRIGGER trigger_check_driver_online_eligibility`);
      await internal(`UPDATE driver SET availability_status='Available' WHERE driver_id='${id}'`);
      await db.exec(`ALTER TABLE public.driver ENABLE TRIGGER trigger_check_driver_online_eligibility`);
    }
    const expected = { 1: 'WARNING', 3: 'ADMIN_REVIEW', 5: 'SUSPENSION', 8: 'SUSPENSION', 10: 'DEACTIVATION' };
    const seen = {};
    for (let n = 1; n <= 10; n++) {
      const r = await strike(type, id, code, `${type}-ladder-${n}`);
      if (!r.ok) { check(`strike ${n} issued`, false, r); continue; }
      seen[n] = r.value.consequence ?? null;
      const want = expected[n] ?? null;
      check(`strike ${n}: consequence ${want}`, (r.value.consequence ?? null) === want && r.value.active_after === n, r.value);
      if (n === 5) {
        const s = await row(type, id);
        check('5 strikes -> Suspended for 3 days (LADDER, threshold 5)',
          s.account_status === 'Suspended' && s.suspension_kind === 'LADDER' && s.suspension_threshold === 5 && Math.abs(days(s.suspended_until) - 3) < 0.05, s);
        if (type === 'driver') check('available driver forced offline on suspension', s.availability_status === 'Offline', s);
      }
      if (n === 7) {
        const s = await row(type, id);
        check('strikes 6-7 inside suspension do not change the end date', Math.abs(days(s.suspended_until) - 3) < 0.05, s);
      }
      if (n === 8) {
        const s = await row(type, id);
        check('8 strikes -> suspension extended to 7 days', Math.abs(days(s.suspended_until) - 7) < 0.05 && s.suspension_threshold === 8, s);
      }
    }
    const s = await row(type, id);
    check('10 strikes -> Deactivated', s.account_status === 'Deactivated' && s.deactivated_at !== null && s.strikes_count === 10, s);
    const f = await flags(id); const types = f.map((x) => x.flag_type);
    check('review flag raised once at 3 strikes', types.filter((t) => t === 'ADMIN_REVIEW_3_STRIKES').length === 1, types);
    const roleWanted = type === 'driver' ? 'toda_admin' : 'lgu_admin';
    check('3-strike review assigned to ' + roleWanted, f.find((x) => x.flag_type === 'ADMIN_REVIEW_3_STRIKES')?.assigned_role === roleWanted, f);
    check('deactivation review flag -> lgu_admin', f.find((x) => x.flag_type === 'DEACTIVATION_REVIEW')?.assigned_role === 'lgu_admin', f);
    check('violation inside suspension raised a discretion flag (22.1)', types.includes('SUSPENSION_NEW_VIOLATION'), types);
    check('each consequence fired exactly once (5 total)', Object.values(seen).filter(Boolean).length === 5, seen);
  }

  // idempotency
  console.log('\nIdempotency');
  const a = await strike('passenger', ID.P2, 'PAX_NO_SHOW', 'idem-1');
  const b = await strike('passenger', ID.P2, 'PAX_NO_SHOW', 'idem-1');
  const cnt = (await db.query(`SELECT count(*)::int n FROM strikes_ledger WHERE idempotency_key='idem-1'`)).rows[0].n;
  check('same idempotency key twice -> one ledger row, second flagged idempotent',
    cnt === 1 && b.value.idempotent === true && a.value.strike_id === b.value.strike_id, { a: a.value, b: b.value });
  check('no-show is 2 points', a.value.points === 2 && a.value.active_after === 2, a.value);

  const au = (await db.query(`SELECT count(*)::int n FROM audit_log WHERE action_type='STRIKE_ISSUED' AND target_id='${ID.P1}'`)).rows[0].n;
  check('audit_log has an entry per strike issued (10)', au === 10, au);
  const au2 = (await db.query(`SELECT actor_role, before_state IS NOT NULL b, after_state IS NOT NULL a FROM audit_log WHERE action_type='STRIKE_ISSUED' LIMIT 1`)).rows[0];
  check('audit entry carries actor role and before/after state', au2.actor_role === 'system' && au2.b && au2.a, au2);

  // ===== 90-day aging ========================================================
  console.log('\nT1 aging: 90-day window');
  await db.exec(`UPDATE strikes_ledger SET issued_at = now() - interval '91 days' WHERE subject_id='${ID.P1}' AND idempotency_key IN ('passenger-ladder-1','passenger-ladder-2','passenger-ladder-3')`);
  const ag = (await db.query(`SELECT get_active_strike_count('passenger','${ID.P1}') n`)).rows[0].n;
  check('strikes older than 90 days no longer count (10 -> 7)', ag === 7, ag);
  const st = await row('passenger', ID.P1);
  check('aging does not lift a deactivation', st.account_status === 'Deactivated', st);

  // ===== T3: deactivation frozen until manual review =========================
  console.log('\nT3 deactivation / reinstatement');
  const noHist = await lgu((tx) => attempt(() => tx.query(`SELECT public.admin_reinstate_account('passenger','${ID.P1}','appeal granted',false)`)));
  check('reactivation refused without history-reviewed confirmation', !noHist.ok && /full violation history/.test(noHist.error), noHist);
  const notLgu = await asUser(db, { uid: ID.P_AUTH }, (tx) => attempt(() => tx.query(`SELECT public.admin_reinstate_account('passenger','${ID.P1}','self',true)`)), { commit: true });
  check('a passenger cannot reinstate their own account', !notLgu.ok && /Only LGU/.test(notLgu.error), notLgu);
  const re = await lgu((tx) => attempt(() => tx.query(`SELECT public.admin_reinstate_account('passenger','${ID.P1}','appeal granted',true) r`)));
  const afterRe = await row('passenger', ID.P1);
  check('LGU reactivation restores Active and clears deactivation', re.ok && afterRe.account_status === 'Active' && afterRe.deactivated_at === null, { re, afterRe });
  check('reinstated account keeps its strike count (22.4)', afterRe.strikes_count >= 7, afterRe);
  const again = await strike('passenger', ID.P1, 'PAX_LATE_CANCEL', 'p1-after-reinstate');
  const afterAgain = await row('passenger', ID.P1);
  check('reinstated account keeps counting: 7 -> 8 strikes crosses the 8-strike 7-day suspension',
    again.ok && again.value.active_after === 8 && again.value.consequence === 'SUSPENSION' && afterAgain.account_status === 'Suspended' && afterAgain.strikes_count === 8, { again, afterAgain });
  // Driver D1 sits at 10 strikes and is deactivated: reinstate, then one more strike must deactivate again.
  await lgu((tx) => tx.query(`SELECT public.admin_reinstate_account('driver','${ID.D1}','TODA appeal reviewed',true)`));
  const d1re = await row('driver', ID.D1);
  check('driver reinstated to Verified with strikes retained', d1re.account_status === 'Verified' && d1re.strikes_count === 10 && d1re.deactivated_at === null, d1re);
  const d1again = await strike('driver', ID.D1, 'DRV_STALL', 'd1-after-reinstate');
  const d1after = await row('driver', ID.D1);
  check('reinstated account still at/over 10 is deactivated again on the next strike',
    d1again.ok && d1again.value.consequence === 'DEACTIVATION' && d1again.value.active_after === 11 && d1after.account_status === 'Deactivated', { d1again, d1after });
  const closeNo = await lgu((tx) => attempt(() => tx.query(`SELECT public.admin_close_account('passenger','${ID.P1}','abuse',false)`)));
  check('permanent closure refused without history-reviewed confirmation', !closeNo.ok, closeNo);
  await lgu((tx) => tx.query(`SELECT public.admin_close_account('passenger','${ID.P1}','confirmed abuse',true)`));
  const closed = await lgu((tx) => attempt(() => tx.query(`SELECT public.admin_reinstate_account('passenger','${ID.P1}','oops',true)`)));
  check('a permanently closed account cannot be reinstated', !closed.ok && /permanently closed/.test(closed.error), closed);

  // ===== suspension expiry / lazy lift =======================================
  console.log('\nT2 suspension auto-lift (22.1)');
  for (let i = 1; i <= 5; i++) await strike('passenger', ID.P2, 'PAX_LATE_CANCEL', `p2-s-${i}`);
  let p2 = await row('passenger', ID.P2);
  check('P2 reached the 5-strike suspension', p2.account_status === 'Suspended' && p2.suspension_kind === 'LADDER', p2);
  await internal(`UPDATE passenger SET suspended_until = now() - interval '1 minute' WHERE passenger_id='${ID.P2}'`);
  const live = (await db.query(`SELECT public.account_restriction_state('passenger','${ID.P2}') s`)).rows[0].s;
  check('expired suspension no longer restricts (live clock check)', live.restricted === false, live);
  const mine = await asUser(db, { uid: ID.P2_AUTH }, async (tx) => (await tx.query(`SELECT public.get_my_account_restriction('passenger') r`)).rows[0].r, { commit: true });
  p2 = await row('passenger', ID.P2);
  check('own-restriction check lifts the expired suspension and restores Active',
    mine.restricted === false && p2.account_status === 'Active' && p2.suspended_until === null, { mine, p2 });
  check('suspension end is audited', (await db.query(`SELECT count(*)::int n FROM audit_log WHERE action_type='ACCOUNT_SUSPENSION_ENDED' AND target_id='${ID.P2}'`)).rows[0].n === 1);

  // ===== immediate escalation ===============================================
  console.log('\nW7 immediate escalation');
  const dui = await strike('driver', ID.D2, 'DRV_DUI', 'd2-dui', { reason: 'Breathalyzer confirmed by TODA' });
  const d2 = await row('driver', ID.D2);
  check('DUI skips the ladder -> open-ended suspension pending investigation',
    dui.ok && d2.account_status === 'Suspended' && d2.suspension_kind === 'INVESTIGATION' && d2.suspended_until === null && d2.strikes_count === 0, { dui, d2 });
  check('immediate escalation flagged to LGU', (await flags(ID.D2)).some((f) => f.flag_type === 'IMMEDIATE_ESCALATION' && f.assigned_role === 'lgu_admin'));
  const gps = await strike('driver', ID.D3, 'DRV_GPS_DISABLED', 'd3-gps');
  const d3 = await row('driver', ID.D3);
  check('GPS-disabled -> review flag only, no strike and no suspension',
    gps.ok && d3.account_status === 'Verified' && d3.strikes_count === 0 &&
    (await flags(ID.D3)).some((f) => f.flag_type === 'GPS_DISABLED_DURING_BOOKING' && f.assigned_role === 'toda_admin'), { gps, d3 });

  // ===== repeated violations (PI-B3) =========================================
  console.log('\nPI-B3 repeated violation');
  const r1 = await strike('passenger', ID.P2, 'PAX_DEST_CHANGE_ABUSE', 'p2-dest-1');
  const r2 = await strike('passenger', ID.P2, 'PAX_DEST_CHANGE_ABUSE', 'p2-dest-2');
  check('first occurrence recorded without a strike', r1.value.observed === true && r1.value.points === 0, r1);
  check('second occurrence within 30 days issues the strike', r2.value.points === 1 && r2.value.observed !== true, r2);

  // ===== T7 / 15.3 / 15.5 exemptions =========================================
  console.log('\nT7 exempt categories');
  const before = (await row('passenger', ID.P2)).strikes_count;
  const vic = await strike('passenger', ID.P2, 'PAX_NO_SHOW', 'p2-victim', { exempt: 'SAFETY_INCIDENT_VICTIM' });
  const afterV = (await row('passenger', ID.P2)).strikes_count;
  const vrow = (await db.query(`SELECT status, points_active, exempt_reason FROM strikes_ledger WHERE idempotency_key='p2-victim'`)).rows[0];
  check('safety-incident victim receives no strike (event still recorded)',
    vic.ok && afterV === before && vrow.status === 'AUTO_WAIVED' && vrow.points_active === 0 && vrow.exempt_reason === 'SAFETY_INCIDENT_VICTIM', { vic, before, afterV, vrow });
  const acc = await strike('driver', ID.D3, 'DRV_STALL', 'd3-accident', { exempt: 'TRAFFIC_ACCIDENT' });
  check('verified traffic accident records no strike (15.5)', acc.ok && acc.value.exempt === true && (await row('driver', ID.D3)).strikes_count === 0, acc);
  const accP = await strike('passenger', ID.P2, 'PAX_NO_SHOW', 'p2-acc', { exempt: 'TRAFFIC_ACCIDENT' });
  check('traffic-accident exemption rejected for passengers', !accP.ok, accP);

  // ===== T6 emergency pause ==================================================
  console.log('\nT6 emergency pause');
  const noAuth = await asUser(db, { uid: ID.T_AUTH }, (tx) => attempt(() => tx.query(`SELECT public.set_strike_accrual_pause(true,'ALL','typhoon')`)), { commit: true });
  check('only the LGU Administrator can pause accrual', !noAuth.ok && /Only the LGU/.test(noAuth.error), noAuth);
  const noReason = await lgu((tx) => attempt(() => tx.query(`SELECT public.set_strike_accrual_pause(true,'ALL',NULL)`)));
  check('pausing requires a stated reason', !noReason.ok, noReason);
  await lgu((tx) => tx.query(`SELECT public.set_strike_accrual_pause(true,'CANCEL_STALL_NOSHOW','Typhoon declared by LGU')`));
  const pre = (await row('passenger', ID.P2)).strikes_count;
  const sp1 = await strike('passenger', ID.P2, 'PAX_NO_SHOW', 'p2-paused');
  const sp2 = await strike('driver', ID.D3, 'DRV_CANCEL_EN_ROUTE', 'd3-paused');
  const nonP = await strike('passenger', ID.P2, 'PAX_REFUSAL_TO_PAY', 'p2-refuse', { reason: 'Admin confirmed' });
  const pw = (await db.query(`SELECT status, points_active, pause_id IS NOT NULL has_pause FROM strikes_ledger WHERE idempotency_key IN ('p2-paused','d3-paused')`)).rows;
  check('no-show and cancellation during the pause: event recorded, zero points',
    sp1.value.paused === true && sp2.value.paused === true && pw.length === 2 && pw.every((r) => r.status === 'AUTO_WAIVED' && r.points_active === 0 && r.has_pause), { sp1, sp2, pw });
  check('violations outside the pause scope still accrue (fare dispute category)', nonP.ok && nonP.value.points === 2 && !nonP.value.paused, nonP);
  check('strike total moved only by the out-of-scope strike', (await row('passenger', ID.P2)).strikes_count === pre + 2, { pre, now: await row('passenger', ID.P2) });
  const pauseAudit = (await db.query(`SELECT count(*)::int n FROM audit_log WHERE action_type='STRIKE_ACCRUAL_PAUSED'`)).rows[0].n;
  const waivedAudit = (await db.query(`SELECT count(*)::int n FROM audit_log WHERE action_type='STRIKE_AUTO_WAIVED' AND details LIKE '%PAUSE%'`)).rows[0].n;
  check('pause recorded as ONE administrative audit action (not per case)', pauseAudit === 1 && waivedAudit === 0, { pauseAudit, waivedAudit });
  await lgu((tx) => tx.query(`SELECT public.set_strike_accrual_pause(false,'ALL',NULL)`));
  const post = await strike('passenger', ID.P2, 'PAX_NO_SHOW', 'p2-after-pause');
  check('strikes accrue again after the pause ends', post.value.points === 2 && !post.value.paused, post);
  check('pause end audited', (await db.query(`SELECT count(*)::int n FROM audit_log WHERE action_type='STRIKE_ACCRUAL_RESUMED'`)).rows[0].n === 1);
  check('serious violations are not pausable', (await db.query(`SELECT bool_or(pausable) p FROM violation_catalog WHERE violation_code IN ('DRV_DUI','DRV_PHYSICAL_ALTERCATION','DRV_HARASSMENT','DRV_GPS_SPOOFING','DRV_UNSAFE_DRIVING')`)).rows[0].p === false);

  // ===== authorization / validation ==========================================
  console.log('\nAuthorization and validation');
  const selfCall = await asUser(db, { uid: ID.P_AUTH }, (tx) => attempt(() => tx.query(`SELECT public.issue_strike('passenger','${ID.P1}','PAX_LATE_CANCEL')`)), { commit: true });
  check('a passenger cannot issue a strike (even against themselves)', !selfCall.ok && /not allowed/.test(selfCall.error), selfCall);
  const todaOwn = await asUser(db, { uid: ID.T_AUTH }, (tx) => attempt(() => tx.query(`SELECT public.issue_strike('driver','${ID.D1}','DRV_QUEUE_CONFLICT',NULL,NULL,NULL,'t-own',NULL,'Confirmed at terminal',NULL,NULL) r`)), { commit: true });
  check('TODA admin can issue a confirmation-based strike to a driver of their own TODA', todaOwn.ok, todaOwn);
  const todaOther = await asUser(db, { uid: ID.T_AUTH }, (tx) => attempt(() => tx.query(`SELECT public.issue_strike('driver','${ID.D3}','DRV_QUEUE_CONFLICT',NULL,NULL,NULL,'t-other',NULL,'x',NULL,NULL)`)), { commit: true });
  check('TODA admin cannot strike a driver of another TODA', !todaOther.ok && /not allowed/.test(todaOther.error), todaOther);
  const todaAuto = await asUser(db, { uid: ID.T_AUTH }, (tx) => attempt(() => tx.query(`SELECT public.issue_strike('driver','${ID.D1}','DRV_STALL',NULL,NULL,NULL,'t-auto',NULL,'x',NULL,NULL)`)), { commit: true });
  check('TODA admin cannot issue system-detected (automatic) violations', !todaAuto.ok, todaAuto);
  const noReasonAdm = await strike('passenger', ID.P2, 'PAX_VEHICLE_DAMAGE', 'dmg-noreason');
  check('admin-confirmed violation requires a reason', !noReasonAdm.ok && /reason is required/.test(noReasonAdm.error), noReasonAdm);
  const badPts = await strike('driver', ID.D3, 'DRV_UNSAFE_DRIVING', 'unsafe-4', { points: 4, reason: 'upheld' });
  const okPts = await strike('driver', ID.D3, 'DRV_UNSAFE_DRIVING', 'unsafe-3', { points: 3, reason: 'upheld' });
  check('points must stay inside the catalog range (2-3)', !badPts.ok && okPts.ok && okPts.value.points === 3, { badPts, okPts });
  const wrongType = await strike('driver', ID.D3, 'PAX_LATE_CANCEL', 'wrong');
  check('a passenger violation cannot be issued to a driver', !wrongType.ok, wrongType);
  const counts = (await db.query(`SELECT violation_code, default_points FROM violation_catalog
    WHERE violation_code IN ('PAX_BOOKING_ABUSE','PAX_VEHICLE_DAMAGE','PAX_CONTAMINATION','DRV_AVAILABILITY_VIOLATION','DRV_PICKUP_DEVIATION') ORDER BY 1`)).rows;
  const m = Object.fromEntries(counts.map((r) => [r.violation_code, r.default_points]));
  check('approved counts: booking abuse=2, damage=3, contamination=1, availability=1, deviation=1',
    m.PAX_BOOKING_ABUSE === 2 && m.PAX_VEHICLE_DAMAGE === 3 && m.PAX_CONTAMINATION === 1 && m.DRV_AVAILABILITY_VIOLATION === 1 && m.DRV_PICKUP_DEVIATION === 1, m);

  process.exit(summary() ? 0 : 1);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
