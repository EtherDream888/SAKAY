// Re-applying the Batch 3 migrations (e.g. a later `supabase db push` replaying history) must succeed
// and must not touch real data: strikes, the ledger, suspensions and the pause switch stay as they are.
const { freshDb, asUser, check, summary } = require('../tlib');
const { applyFile } = require('../lib');
const { ID, seed } = require('../fixtures');

const BATCH3 = [
  '20261004000001_batch3_strike_foundation.sql',
  '20261004000002_batch3_strike_engine.sql',
  '20261004000003_batch3_exemptions_and_sweep.sql',
  '20261004000004_batch3_enforcement_guards.sql',
];

(async () => {
  const db = await freshDb(BATCH3[3]);
  await seed(db);
  const svc = (fn) => asUser(db, { role: 'service_role' }, fn, { commit: true });
  const lgu = (fn) => asUser(db, { uid: ID.L_AUTH }, fn, { commit: true });

  // Real-looking state: 6 strikes (suspended), one waived exemption, and an active pause.
  for (let i = 1; i <= 6; i++) {
    await svc((tx) => tx.query(`SELECT public.issue_strike('passenger',$1,'PAX_LATE_CANCEL',NULL,NULL,NULL,$2,NULL,NULL,NULL,NULL)`, [ID.P1, `re-${i}`]));
  }
  await lgu((tx) => tx.query(`SELECT public.set_strike_accrual_pause(true,'ALL','Typhoon')`));

  const snap = async () => ({
    pax: (await db.query(`SELECT strikes_count, account_status, suspension_kind, (suspended_until IS NOT NULL) AS has_until FROM passenger WHERE passenger_id='${ID.P1}'`)).rows[0],
    ledger: (await db.query('SELECT count(*)::int n FROM strikes_ledger')).rows[0].n,
    catalog: (await db.query('SELECT count(*)::int n FROM violation_catalog')).rows[0].n,
    pause: (await db.query(`SELECT config_value->>'paused' p, config_value->>'pause_id' id FROM system_policy_config WHERE config_key='strike_accrual_paused'`)).rows[0],
  });
  const before = await snap();
  check('precondition: account is suspended with 6 strikes and the pause is on', before.pax.strikes_count === 6 && before.pax.account_status === 'Suspended' && before.pause.p === 'true', before);

  let error = null;
  try {
    for (const f of BATCH3) await applyFile(db, f);
  } catch (e) {
    error = e.message;
  }
  check('all four Batch 3 migrations re-apply without error', error === null, error);

  const after = await snap();
  check('re-applying does not reset strikes, suspension, ledger, catalog or the pause switch',
    JSON.stringify(before) === JSON.stringify(after), { before, after });

  // The protections still hold after re-application
  const blocked = await asUser(db, { uid: ID.P_AUTH }, async (tx) => {
    try { await tx.query(`UPDATE passenger SET strikes_count = 0 WHERE passenger_id='${ID.P1}'`); return 'allowed'; }
    catch (e) { return e.message; }
  });
  check('the strike-column protection still holds after re-application', /policy engine/.test(blocked), blocked);

  process.exit(summary() ? 0 : 1);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
