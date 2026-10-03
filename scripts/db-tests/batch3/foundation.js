const { freshDb, asUser, attempt, check, summary } = require('../tlib');
(async () => {
  const db = await freshDb('20261004000001_batch3_strike_foundation.sql');
  // fixtures (superuser)
  const P_AUTH = '11111111-1111-1111-1111-111111111111', P_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const L_AUTH = '22222222-2222-2222-2222-222222222222';
  await db.exec(`
    INSERT INTO auth.users(id, email) VALUES ('${P_AUTH}','p@x.com'), ('${L_AUTH}','l@x.com') ON CONFLICT DO NOTHING;
    INSERT INTO public.passenger(passenger_id, auth_user_id, full_name, contact_number, account_status)
      VALUES ('${P_ID}','${P_AUTH}','Pax One','+639170000001','Active') ON CONFLICT DO NOTHING;
    INSERT INTO public.lgu_admin(auth_user_id, full_name, email) VALUES ('${L_AUTH}','LGU Admin','l@x.com') ON CONFLICT DO NOTHING;
  `);
  console.log('Foundation checks');
  const cat = await db.query(`SELECT count(*)::int n, count(*) FILTER (WHERE applies_to='passenger')::int p, count(*) FILTER (WHERE applies_to='driver')::int d FROM violation_catalog`);
  check('catalog seeded (16 passenger + 23 driver rows)', cat.rows[0].n === 39 && cat.rows[0].p === 16 && cat.rows[0].d === 23, cat.rows[0]);
  const cfg = await db.query(`SELECT config_value FROM system_policy_config WHERE config_key='strike_accrual_paused'`);
  check('pause switch seeded as not paused', cfg.rows[0]?.config_value?.paused === false, cfg.rows);
  const c = await db.query(`SELECT strike_policy_constant('suspension_1_days') a, strike_policy_constant('suspension_2_days') b, strike_policy_constant('exemption_window_hours') c, strike_policy_constant('window_days') d`);
  check('constants: 3-day @5, 7-day @8, 72h window, 90d window', c.rows[0].a===3 && c.rows[0].b===7 && c.rows[0].c===72 && c.rows[0].d===90, c.rows[0]);

  // Engine sets a non-default state first, so the passenger's attempts below are real changes.
  await db.exec(`SELECT set_config('sakay.internal_context','true',false);
    UPDATE public.passenger SET strikes_count = 6, suspended_until = now() + interval '3 days', suspension_kind = 'LADDER',
      deactivated_at = now(), closed_at = now(), suspension_reason = 'x', suspended_at = now() WHERE passenger_id = '${P_ID}';
    SELECT set_config('sakay.internal_context','',false);`);
  // Passenger tries to wipe own strike state / status directly
  for (const col of ['strikes_count = 0', "suspended_until = NULL", "deactivated_at = NULL", "suspension_kind = NULL", "closed_at = NULL", "suspension_reason = NULL"]) {
    const r = await asUser(db, { uid: P_AUTH }, (tx) => attempt(() => tx.query(`UPDATE public.passenger SET ${col} WHERE passenger_id='${P_ID}'`)));
    check(`passenger cannot write ${col.split(' ')[0]}`, !r.ok && /policy engine/.test(r.error), r);
  }
  // LGU admin cannot write the columns directly either
  const lg = await asUser(db, { uid: L_AUTH }, (tx) => attempt(() => tx.query(`UPDATE public.passenger SET strikes_count = 9 WHERE passenger_id='${P_ID}'`)));
  check('LGU admin cannot write strikes_count directly', !lg.ok && /policy engine/.test(lg.error), lg);
  const lg2 = await asUser(db, { uid: L_AUTH }, (tx) => attempt(() => tx.query(`UPDATE public.passenger SET suspended_until = now() + interval '1 day' WHERE passenger_id='${P_ID}'`)));
  check('LGU admin cannot write suspended_until directly', !lg2.ok && /policy engine/.test(lg2.error), lg2);
  // Non-protected columns still writable by the passenger (no regression)
  const ok = await asUser(db, { uid: P_AUTH }, (tx) => attempt(() => tx.query(`UPDATE public.passenger SET full_name='Renamed' WHERE passenger_id='${P_ID}'`)));
  check('passenger can still edit unprotected columns', ok.ok, ok);
  // service role + engine context allowed
  const sr = await asUser(db, { role: 'service_role' }, (tx) => attempt(() => tx.query(`UPDATE public.passenger SET strikes_count = 2 WHERE passenger_id='${P_ID}'`)));
  check('service_role can write strike state', sr.ok, sr);
  const ic = await asUser(db, { uid: P_AUTH }, async (tx) => { await tx.query(`SELECT set_config('sakay.internal_context','true',true)`); return attempt(() => tx.query(`UPDATE public.passenger SET strikes_count = 2 WHERE passenger_id='${P_ID}'`)); });
  check('engine (internal context) can write strike state', ic.ok, ic);
  // pause switch protected
  const pz = await asUser(db, { uid: L_AUTH }, (tx) => attempt(() => tx.query(`UPDATE system_policy_config SET config_value='{"paused":true}'::jsonb WHERE config_key='strike_accrual_paused'`)));
  check('LGU admin cannot flip strike_accrual_paused directly', !pz.ok && /set_strike_accrual_pause/.test(pz.error), pz);
  // ledger/catalog/exemption not writable by clients
  const lw = await asUser(db, { uid: P_AUTH }, (tx) => attempt(() => tx.query(`INSERT INTO strikes_ledger(subject_type,subject_id,violation_code,source_rule,points_issued,points_active) VALUES ('passenger','${P_ID}','PAX_NO_SHOW','x',2,2)`)));
  check('client cannot insert into strikes_ledger', !lw.ok, lw);
  // helpers
  const bd = await db.query(`SELECT add_business_days('2026-10-02 10:00+08', 3) AS d`); // Fri -> Wed
  check('3 business days from Fri 10:00 Manila = Wed 10:00 Manila', new Date(bd.rows[0].d).toISOString() === '2026-10-07T02:00:00.000Z', bd.rows[0]);
  const rs = await db.query(`SELECT account_restriction_state('passenger','${P_ID}') s`);
  check('restriction state reflects engine-set closed account', rs.rows[0].s.restricted === true && rs.rows[0].s.kind === 'CLOSED', rs.rows[0]);
  process.exit(summary() ? 0 : 1);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
