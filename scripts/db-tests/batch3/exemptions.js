const { freshDb, asUser, attempt, check, summary } = require('../tlib');
const { ID, seed } = require('../fixtures');

(async () => {
  const db = await freshDb('20261004000003_batch3_exemptions_and_sweep.sql');
  await seed(db);
  const svc = (fn) => asUser(db, { role: 'service_role' }, fn, { commit: true });
  const as = (uid, fn) => asUser(db, { uid }, fn, { commit: true });
  const strike = (type, id, code, key, extra = {}) => svc(async (tx) => {
    const r = await tx.query('SELECT public.issue_strike($1,$2,$3,$4,NULL,NULL,$5,$6,$7,NULL,NULL) r',
      [type, id, code, extra.points ?? null, key, extra.prov ?? null, extra.reason ?? null]);
    return r.rows[0].r;
  });
  const sid = async (key) => (await db.query(`SELECT strike_id FROM strikes_ledger WHERE idempotency_key='${key}'`)).rows[0].strike_id;
  const request = (uid, strikeId, cause = 'VEHICLE_BREAKDOWN', party = false) => as(uid, (tx) => attempt(async () =>
    (await tx.query(`SELECT public.submit_exemption_request($1,$2,'Photo of the breakdown attached','["https://x/e.jpg"]'::jsonb,$3) r`, [strikeId, cause, party])).rows[0].r));
  const decide = (uid, reqId, outcome, reason, pts = null) => as(uid, (tx) => attempt(async () =>
    (await tx.query('SELECT public.decide_exemption($1,$2,$3,$4) r', [reqId, outcome, reason, pts])).rows[0].r));
  const subj = async (type, id) => (await db.query(type === 'passenger'
    ? `SELECT account_status, strikes_count, suspended_until, suspension_kind FROM passenger WHERE passenger_id='${id}'`
    : `SELECT account_status, strikes_count, suspended_until, suspension_kind FROM driver WHERE driver_id='${id}'`)).rows[0];
  const ledger = async (key) => (await db.query(`SELECT status, points_issued, points_active FROM strikes_ledger WHERE idempotency_key='${key}'`)).rows[0];

  // ===== T4: outcomes ========================================================
  console.log('T4 exemption outcomes and window');
  await strike('driver', ID.D1, 'DRV_STALL', 'd1-stall-1');
  const full = await request(ID.D_AUTH, await sid('d1-stall-1'));
  check('driver request routes to the TODA Administrator first (25.4)', full.ok && full.value.assigned_role === 'toda_admin' && full.value.status === 'Pending TODA Review', full);
  check('decision deadline is 3 business days out', new Date(full.value.decision_due_at) > new Date(Date.now() + 3 * 86400000 - 60000), full.value);
  const dup = await request(ID.D_AUTH, await sid('d1-stall-1'));
  check('a second request for the same strike is refused while one is pending', !dup.ok && /already pending/.test(dup.error), dup);

  const seeT1 = await asUser(db, { uid: ID.T_AUTH }, async (tx) => (await tx.query('SELECT count(*)::int n FROM exemption_request')).rows[0].n, { commit: true });
  const seeT2 = await asUser(db, { uid: ID.T2_AUTH }, async (tx) => (await tx.query('SELECT count(*)::int n FROM exemption_request')).rows[0].n, { commit: true });
  check('TODA admin sees only their own TODA requests (RLS)', seeT1 === 1 && seeT2 === 0, { seeT1, seeT2 });
  const wrongToda = await decide(ID.T2_AUTH, full.value.request_id, 'FULL', 'ok');
  check('another TODA\'s admin cannot decide it', !wrongToda.ok && /not assigned/.test(wrongToda.error), wrongToda);
  const noReason = await decide(ID.T_AUTH, full.value.request_id, 'FULL', '  ');
  check('a stated reason is mandatory', !noReason.ok && /reason is required/.test(noReason.error), noReason);
  const dFull = await decide(ID.T_AUTH, full.value.request_id, 'FULL', 'Breakdown verified with mechanic receipt');
  check('Full Waiver removes the strike and updates the count', dFull.ok && dFull.value.status === 'Full Waiver' && (await subj('driver', ID.D1)).strikes_count === 0 && (await ledger('d1-stall-1')).status === 'WAIVED', { dFull, s: await subj('driver', ID.D1) });
  const aud = (await db.query(`SELECT actor_id, actor_role, details FROM audit_log WHERE action_type='EXEMPTION_DECIDED' AND target_id='${ID.D1}'`)).rows[0];
  check('decision logged with the reviewing admin\'s ID, decision and rationale (25.8)', aud && aud.actor_id === ID.T_AUTH && aud.actor_role === 'toda_admin' && /Full Waiver/.test(aud.details) && /mechanic receipt/.test(aud.details), aud);
  const again = await decide(ID.T_AUTH, full.value.request_id, 'DENIED', 'changed my mind');
  check('a decided request cannot be decided again', !again.ok && /already been decided/.test(again.error), again);

  await strike('driver', ID.D1, 'DRV_OVERCHARGING', 'd1-over', { reason: 'Passenger receipt shows 2x fare' });
  const part = await request(ID.D_AUTH, await sid('d1-over'), 'OTHER');
  const dPart = await decide(ID.T_AUTH, part.value.request_id, 'PARTIAL', 'Partly justified: one leg was a road closure detour', 1);
  const l = await ledger('d1-over');
  check('Partial Waiver reduces 2 strikes to 1', dPart.ok && l.points_active === 1 && l.status === 'PARTIALLY_WAIVED' && (await subj('driver', ID.D1)).strikes_count === 1, { dPart, l });
  const badPart = await (async () => { await strike('driver', ID.D1, 'DRV_OVERCHARGING', 'd1-over2', { reason: 'x' }); const r = await request(ID.D_AUTH, await sid('d1-over2'), 'OTHER'); return decide(ID.T_AUTH, r.value.request_id, 'PARTIAL', 'x', 2); })();
  check('a partial waiver must leave at least one point', !badPart.ok, badPart);

  await strike('driver', ID.D1, 'DRV_CANCEL_BEFORE_TRAVEL', 'd1-cancel');
  const den = await request(ID.D_AUTH, await sid('d1-cancel'), 'OTHER');
  const before = (await subj('driver', ID.D1)).strikes_count;
  const dDen = await decide(ID.T_AUTH, den.value.request_id, 'DENIED', 'No supporting evidence');
  check('Denied: the strike stands with a stated reason', dDen.ok && dDen.value.status === 'Denied' && (await subj('driver', ID.D1)).strikes_count === before && (await ledger('d1-cancel')).status === 'ACTIVE', dDen);

  // window
  await strike('driver', ID.D1, 'DRV_STALL', 'd1-late');
  await db.exec(`UPDATE strikes_ledger SET issued_at = now() - interval '73 hours' WHERE idempotency_key='d1-late'`);
  const late = await request(ID.D_AUTH, await sid('d1-late'));
  check('request after 72 hours is rejected (D1 window)', !late.ok && /72 hour window/.test(late.error), late);
  await strike('driver', ID.D1, 'DRV_STALL', 'd1-ok71');
  await db.exec(`UPDATE strikes_ledger SET issued_at = now() - interval '71 hours' WHERE idempotency_key='d1-ok71'`);
  check('request at 71 hours is accepted', (await request(ID.D_AUTH, await sid('d1-ok71'))).ok);
  await strike('driver', ID.D1, 'DRV_DELIBERATE_OFFLINE', 'd1-delib');
  const nel = await request(ID.D_AUTH, await sid('d1-delib'));
  check('deliberate mid-trip offline (9.6) is not eligible for exemption', !nel.ok && /not eligible/.test(nel.error), nel);
  const stranger = await request(ID.D3_AUTH, await sid('d1-ok71'));
  check('only the account holder can request an exemption for their strike', !stranger.ok && /your own strike/.test(stranger.error), stranger);

  // ===== 25.7 / PI-B2 repeated cause ========================================
  console.log('\nPI-B2 repeated cause (25.7)');
  const res = [];
  for (let i = 1; i <= 4; i++) {
    await strike('driver', ID.D3, 'DRV_STALL', `d3-batt-${i}`);
    res.push(await request(ID.D3_AUTH, await sid(`d3-batt-${i}`), 'DEVICE_FAILURE'));
  }
  check('1st-3rd request on the same cause in 30 days are reviewed', res.slice(0, 3).every((r) => r.ok && !r.value.auto_denied && r.value.status !== 'Denied'), res.map((r) => r.value?.status));
  check('4th request on the same cause is denied automatically', res[3].ok && res[3].value.auto_denied === true && res[3].value.status === 'Denied', res[3]);
  const autoRow = (await db.query(`SELECT decision_reason, decided_by_role FROM exemption_request WHERE auto_denied`)).rows[0];
  check('automatic denial states the rule and is audited', /25\.7/.test(autoRow.decision_reason) && autoRow.decided_by_role === 'system' &&
    (await db.query(`SELECT count(*)::int n FROM audit_log WHERE action_type='EXEMPTION_AUTO_DENIED'`)).rows[0].n === 1, autoRow);
  const otherCause = await (async () => { await strike('driver', ID.D3, 'DRV_STALL', 'd3-other'); return request(ID.D3_AUTH, await sid('d3-other'), 'MEDICAL_EMERGENCY'); })();
  check('a different cause is not counted against the driver', otherCause.ok && !otherCause.value.auto_denied, otherCause);

  // ===== T5: routing =========================================================
  console.log('\nT5 routing and escalation');
  await strike('passenger', ID.P1, 'PAX_LATE_CANCEL', 'p1-lc');
  const pr = await request(ID.P_AUTH, await sid('p1-lc'), 'NETWORK_OUTAGE');
  check('passenger request goes directly to the LGU Administrator (25.5)', pr.ok && pr.value.assigned_role === 'lgu_admin' && pr.value.status === 'Pending LGU Review', pr);
  const todaOnPax = await decide(ID.T_AUTH, pr.value.request_id, 'FULL', 'x');
  check('a TODA admin cannot decide a passenger request', !todaOnPax.ok, todaOnPax);

  await strike('driver', ID.D2, 'DRV_STALL', 'd2-party');
  const party = await request(ID.D2_AUTH, await sid('d2-party'), 'VEHICLE_BREAKDOWN', true);
  check('driver request goes to the LGU when the TODA is a party to the dispute', party.ok && party.value.assigned_role === 'lgu_admin', party);

  await strike('driver', ID.D2, 'DRV_STALL', 'd2-s2');
  await strike('driver', ID.D2, 'DRV_STALL', 'd2-s3');
  await strike('driver', ID.D2, 'DRV_STALL', 'd2-s4');
  const trig = await strike('driver', ID.D2, 'DRV_STALL', 'd2-s5');   // 5 strikes -> 3-day suspension
  const suspLevel = await request(ID.D2_AUTH, await sid('d2-s5'), 'NETWORK_OUTAGE');
  check('suspension-level driver request escalates to the LGU (25.4)', trig.consequence === 'SUSPENSION' && suspLevel.ok && suspLevel.value.assigned_role === 'lgu_admin', { trig, suspLevel });

  // A clean driver (no other strikes) so the request is routed to the TODA, not the LGU.
  await db.exec(`INSERT INTO auth.users(id,email) VALUES ('20000000-0000-0000-0000-000000000004','d4@x.com');
    INSERT INTO public.driver(driver_id,auth_user_id,full_name,contact_number,account_status,toda_id)
    VALUES ('b0000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','Driver Four','+639180000004','Verified','${ID.TODA1}')`);
  const D4 = 'b0000000-0000-0000-0000-000000000004', D4_AUTH = '20000000-0000-0000-0000-000000000004';
  await strike('driver', D4, 'DRV_STALL', 'd4-esc');
  const esc = await request(D4_AUTH, await sid('d4-esc'));
  check('clean driver request is routed to the TODA (precondition)', esc.ok && esc.value.assigned_role === 'toda_admin', esc);
  const escOk = await as(ID.T_AUTH, (tx) => attempt(async () => (await tx.query(`SELECT public.escalate_exemption_request($1,'Evidence needs LGU inspection') r`, [esc.value.request_id])).rows[0].r));
  check('TODA admin can escalate a pending request to the LGU', escOk.ok && escOk.value.status === 'Pending LGU Review', escOk);
  const afterEsc = await decide(ID.T_AUTH, esc.value.request_id, 'FULL', 'x');
  check('after escalation the TODA admin can no longer decide it', !afterEsc.ok && /not assigned/.test(afterEsc.error), afterEsc);

  // ===== PI-B8: waiver lifts the suspension it caused =======================
  console.log('\nPI-B8 waiver lifts the suspension it caused');
  const dLift = await decide(ID.L_AUTH, suspLevel.value.request_id, 'FULL', 'Telco outage advisory verified');
  const d2s = await subj('driver', ID.D2);
  check('waiving the 5th strike lifts the 5-strike suspension and restores the driver', dLift.ok && dLift.value.reevaluation.suspension_lifted === true && d2s.account_status === 'Verified' && d2s.suspended_until === null && d2s.strikes_count === 4, { dLift: dLift.value, d2s });

  // ===== provisional strikes and the sweep ==================================
  console.log('\nW8 provisional strikes and the sweep');
  const prov = await strike('driver', ID.D3, 'DRV_CONNECTIVITY_FAILURE', 'd3-prov');
  const pl = (await db.query(`SELECT status, provisional_until FROM strikes_ledger WHERE idempotency_key='d3-prov'`)).rows[0];
  check('connectivity failure is issued at once as PROVISIONAL with a 72h window', prov.success && pl.status === 'PROVISIONAL' && Math.abs((new Date(pl.provisional_until) - Date.now()) / 3600000 - 72) < 0.1, pl);
  const noSvc = await as(ID.L_AUTH, (tx) => attempt(() => tx.query('SELECT public.sweep_strike_state()')));
  check('the sweep is callable only by the service role', !noSvc.ok, noSvc);
  await db.exec(`UPDATE strikes_ledger SET provisional_until = now() - interval '1 minute' WHERE idempotency_key='d3-prov'`);
  const sw = await svc(async (tx) => (await tx.query('SELECT public.sweep_strike_state() r')).rows[0].r);
  check('after the window, an unchallenged provisional strike is confirmed', sw.provisional_confirmed >= 1 && (await ledger('d3-prov')).status === 'ACTIVE', sw);
  const sw2 = await svc(async (tx) => (await tx.query('SELECT public.sweep_strike_state() r')).rows[0].r);
  check('sweep is idempotent (second run changes nothing)', sw2.provisional_confirmed === 0 && sw2.lifted_suspensions === 0, sw2);

  await strike('driver', D4, 'DRV_CONNECTIVITY_FAILURE', 'd4-prov2');
  const rq = await request(D4_AUTH, await sid('d4-prov2'), 'MEDICAL_EMERGENCY');
  await db.exec(`UPDATE strikes_ledger SET provisional_until = now() - interval '1 minute' WHERE idempotency_key='d4-prov2'`);
  await svc((tx) => tx.query('SELECT public.sweep_strike_state()'));
  check('a provisional strike with a pending request is NOT auto-confirmed', (await ledger('d4-prov2')).status === 'PROVISIONAL', await ledger('d4-prov2'));

  // sweep: SLA escalation (request is still pending TODA review, so the deadline applies)
  check('precondition: request is pending TODA review', rq.ok && rq.value.status === 'Pending TODA Review', rq);
  await db.exec(`UPDATE exemption_request SET decision_due_at = now() - interval '1 hour' WHERE request_id='${rq.value.request_id}' AND status='Pending TODA Review'`);
  const sla = await svc(async (tx) => (await tx.query('SELECT public.sweep_strike_state() r')).rows[0].r);
  const slaRow = (await db.query(`SELECT status, assigned_role FROM exemption_request WHERE request_id='${rq.value.request_id}'`)).rows[0];
  check('a request that missed the 3-business-day deadline escalates to the LGU with a review flag', sla.requests_escalated >= 1 && slaRow.assigned_role === 'lgu_admin' &&
    (await db.query(`SELECT count(*)::int n FROM admin_review_flag WHERE flag_type='EXEMPTION_SLA_BREACH'`)).rows[0].n >= 1, { sla, slaRow });

  // sweep: expiry + count refresh
  await db.exec(`UPDATE strikes_ledger SET issued_at = now() - interval '100 days' WHERE idempotency_key IN ('d2-s2','d2-s3','d2-s4')`);
  const sw3 = await svc(async (tx) => (await tx.query('SELECT public.sweep_strike_state() r')).rows[0].r);
  check('sweep refreshes cached counts after strikes age out of the 90-day window', sw3.counts_refreshed >= 1 && (await subj('driver', ID.D2)).strikes_count === 1, { sw3, d2: await subj('driver', ID.D2) });

  // ===== void ================================================================
  console.log('\nW1 canonical void');
  await strike('passenger', ID.P2, 'PAX_NO_SHOW', 'p2-ns');
  const vid = await sid('p2-ns');   // resolved outside the transaction (single-connection engine)
  const notLgu = await as(ID.P2_AUTH, (tx) => attempt(async () => (await tx.query(`SELECT public.admin_void_strike($1,'mine') r`, [vid])).rows[0].r));
  check('only an LGU administrator can void a strike', !notLgu.ok, notLgu);
  const v1 = await as(ID.L_AUTH, (tx) => attempt(async () => (await tx.query(`SELECT public.admin_void_strike($1,'Duplicate record') r`, [vid])).rows[0].r));
  const v2 = await as(ID.L_AUTH, (tx) => attempt(async () => (await tx.query(`SELECT public.admin_void_strike($1,'Duplicate record') r`, [vid])).rows[0].r));
  check('void zeroes the strike, updates the count, and is idempotent', v1.ok && v2.ok && v2.value.idempotent === true && (await subj('passenger', ID.P2)).strikes_count === 0 && (await ledger('p2-ns')).status === 'VOIDED', { v1, v2 });
  check('void is audited', (await db.query(`SELECT count(*)::int n FROM audit_log WHERE action_type='STRIKE_VOIDED' AND target_id='${ID.P2}'`)).rows[0].n === 1);

  // ===== review flags ========================================================
  console.log('\nShared review flag mechanism');
  const fl = await svc(async (tx) => (await tx.query(`SELECT public.create_admin_review_flag('REPEAT_REFUSAL','driver',$1,'Rule 7.9','toda_admin','{"n":3}'::jsonb) r`, [ID.D1])).rows[0].r);
  const fl2 = await svc(async (tx) => (await tx.query(`SELECT public.create_admin_review_flag('REPEAT_REFUSAL','driver',$1,'Rule 7.9','toda_admin',NULL) r`, [ID.D1])).rows[0].r);
  check('creating the same open flag twice returns the existing flag (no duplicates)', fl === fl2, { fl, fl2 });
  const vis1 = await as(ID.T_AUTH, async (tx) => (await tx.query(`SELECT count(*)::int n FROM admin_review_flag WHERE flag_id='${fl}'`)).rows[0].n);
  const vis2 = await as(ID.T2_AUTH, async (tx) => (await tx.query(`SELECT count(*)::int n FROM admin_review_flag WHERE flag_id='${fl}'`)).rows[0].n);
  check('TODA admin sees flags for their own drivers only (role scoping)', vis1 === 1 && vis2 === 0, { vis1, vis2 });
  const res2 = await as(ID.T2_AUTH, (tx) => attempt(() => tx.query(`SELECT public.resolve_admin_review_flag('${fl}','Resolved','done')`)));
  check('another TODA\'s admin cannot resolve it', !res2.ok, res2);
  const noNote = await as(ID.T_AUTH, (tx) => attempt(() => tx.query(`SELECT public.resolve_admin_review_flag('${fl}','Resolved','')`)));
  check('resolving requires a note', !noNote.ok, noNote);
  const okRes = await as(ID.T_AUTH, (tx) => attempt(() => tx.query(`SELECT public.resolve_admin_review_flag('${fl}','Resolved','Spoke to the driver; warned') r`)));
  const frow = (await db.query(`SELECT status, resolved_by FROM admin_review_flag WHERE flag_id='${fl}'`)).rows[0];
  check('resolution records the reviewer and is audited', okRes.ok && frow.status === 'Resolved' && frow.resolved_by === ID.T_AUTH &&
    (await db.query(`SELECT count(*)::int n FROM audit_log WHERE action_type='ADMIN_REVIEW_FLAG_RESOLVED'`)).rows[0].n === 1, frow);
  const badFlag = await svc((tx) => attempt(() => tx.query(`SELECT public.create_admin_review_flag('bad flag!','driver','x','r','lgu_admin',NULL)`)));
  check('flag type vocabulary is validated', !badFlag.ok, badFlag);
  const flagOther = await as(ID.T_AUTH, (tx) => attempt(() => tx.query(`SELECT public.create_admin_review_flag('X_Y','driver','${ID.D3}','r','lgu_admin',NULL)`)));
  check('TODA admin cannot flag a driver of another TODA', !flagOther.ok, flagOther);

  // ===== RLS on the ledger ===================================================
  console.log('\nLedger visibility');
  const ownRows = await as(ID.P_AUTH, async (tx) => (await tx.query('SELECT count(*)::int n, count(DISTINCT subject_id)::int s FROM strikes_ledger')).rows[0]);
  check('a passenger sees only their own strike rows', ownRows.n >= 1 && ownRows.s === 1, ownRows);
  const hist = await as(ID.P_AUTH, (tx) => attempt(async () => (await tx.query(`SELECT public.get_strike_history('passenger','${ID.P1}') r`)).rows[0].r));
  const histOther = await as(ID.P_AUTH, (tx) => attempt(() => tx.query(`SELECT public.get_strike_history('passenger','${ID.P2}')`)));
  check('strike history readable for self, refused for another account', hist.ok && hist.value.strikes.length >= 1 && !histOther.ok, { hist: hist.ok, histOther });

  process.exit(summary() ? 0 : 1);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
