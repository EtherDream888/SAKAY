const { freshDb, asUser, attempt, check, summary } = require('../tlib');
const { ID, seed } = require('../fixtures');

(async () => {
  const db = await freshDb('20261004000004_batch3_enforcement_guards.sql');
  await seed(db);
  const svc = (fn) => asUser(db, { role: 'service_role' }, fn, { commit: true });
  const as = (uid, fn) => asUser(db, { uid }, fn, { commit: true });
  const internal = (sql) => db.exec(`SELECT set_config('sakay.internal_context','true',false); ${sql}; SELECT set_config('sakay.internal_context','',false);`);
  const strikeN = async (type, id, code, n, tag) => { for (let i = 1; i <= n; i++) await svc((tx) => tx.query('SELECT public.issue_strike($1,$2,$3,NULL,NULL,NULL,$4,NULL,NULL,NULL,NULL)', [type, id, code, `${tag}-${i}`])); };
  const book = (uid, pid) => as(uid, (tx) => attempt(() => tx.query(
    `INSERT INTO booking(passenger_id,passenger_count,pickup_address,pickup_latitude,pickup_longitude,dropoff_address,dropoff_latitude,dropoff_longitude)
     VALUES ('${pid}',1,'A',13.4115,121.1803,'B',13.42,121.19)`)));

  console.log('T2 passenger booking guard');
  const ctrl = await book(ID.P_AUTH, ID.P1);
  check('control: an unrestricted passenger can book', ctrl.ok, ctrl);
  await db.exec(`DELETE FROM booking`);

  await strikeN('passenger', ID.P1, 'PAX_LATE_CANCEL', 5, 'p1');           // 5 strikes -> 3-day suspension
  const sus = await book(ID.P_AUTH, ID.P1);
  check('suspended passenger cannot create a booking (DB-enforced)', !sus.ok && /ERR_ACCOUNT_SUSPENDED/.test(sus.error), sus);
  check('the error names the end of the suspension in Manila time', /until [A-Z][a-z]{2} \d{2}, \d{4}.*PHT/.test(sus.error) && /until=\d{4}-\d{2}-\d{2}T/.test(sus.error), sus.error);

  await internal(`UPDATE passenger SET suspended_until = now() - interval '1 minute' WHERE passenger_id='${ID.P1}'`);
  const exp = await book(ID.P_AUTH, ID.P1);
  check('once the suspension period ends the passenger can book again (no sweep needed)', exp.ok, exp);
  await db.exec(`DELETE FROM booking`);

  await strikeN('passenger', ID.P2, 'PAX_LATE_CANCEL', 10, 'p2');         // deactivated
  const deact = await book(ID.P2_AUTH, ID.P2);
  check('deactivated passenger cannot create a booking', !deact.ok && /ERR_ACCOUNT_DEACTIVATED/.test(deact.error), deact);
  await svc((tx) => tx.query(`SELECT 1`));
  await as(ID.L_AUTH, (tx) => tx.query(`SELECT public.admin_reinstate_account('passenger','${ID.P2}','appeal',true)`));
  const reinst = await book(ID.P2_AUTH, ID.P2);
  check('after manual reactivation the passenger can book again', reinst.ok, reinst);
  await db.exec(`DELETE FROM booking`);

  console.log('\nT2 driver offer / accept / online guards');
  await db.exec(`INSERT INTO booking(booking_id,passenger_id,passenger_count,pickup_address,pickup_latitude,pickup_longitude,dropoff_address,dropoff_latitude,dropoff_longitude)
    VALUES ('d0000000-0000-0000-0000-000000000001','${ID.P2}',1,'A',13.4115,121.1803,'B',13.42,121.19)`);
  const offer = (did) => svc((tx) => attempt(() => tx.query(`INSERT INTO dispatch_attempt(booking_id,driver_id,dispatch_method) VALUES ('d0000000-0000-0000-0000-000000000001','${did}','Tier 1')`)));
  const ok1 = await offer(ID.D1);
  check('control: an unrestricted driver can be offered a booking', ok1.ok, ok1);
  await db.exec(`DELETE FROM dispatch_attempt`);

  await strikeN('driver', ID.D1, 'DRV_STALL', 5, 'd1');                    // suspended
  const o2 = await offer(ID.D1);
  check('suspended driver cannot be offered a booking', !o2.ok && /ERR_ACCOUNT_SUSPENDED/.test(o2.error), o2);
  const acc = await svc((tx) => attempt(() => tx.query(`UPDATE booking SET driver_id='${ID.D1}', booking_status='Accepted' WHERE booking_id='d0000000-0000-0000-0000-000000000001'`)));
  check('suspended driver cannot accept a booking', !acc.ok && /ERR_ACCOUNT_SUSPENDED/.test(acc.error), acc);
  const ok2 = await svc((tx) => attempt(() => tx.query(`UPDATE booking SET driver_id='${ID.D3}', booking_status='Accepted' WHERE booking_id='d0000000-0000-0000-0000-000000000001'`)));
  check('control: an unrestricted driver can still accept (row actually updated)', ok2.ok && ok2.value.rowCount === 1, ok2);

  const online = await as(ID.D_AUTH, (tx) => attempt(() => tx.query(`UPDATE driver SET availability_status='Available' WHERE driver_id='${ID.D1}'`)));
  check('suspended driver cannot go online, with the real reason and end date', !online.ok && /ERR_ACCOUNT_SUSPENDED/.test(online.error) && /PHT/.test(online.error), online);

  // Active trip is never interrupted; forced offline when it ends
  await db.exec(`ALTER TABLE public.driver DISABLE TRIGGER trigger_check_driver_online_eligibility`);
  await internal(`UPDATE driver SET availability_status='Busy' WHERE driver_id='${ID.D2}'`);
  await db.exec(`ALTER TABLE public.driver ENABLE TRIGGER trigger_check_driver_online_eligibility`);
  await strikeN('driver', ID.D2, 'DRV_STALL', 5, 'd2');
  const mid = (await db.query(`SELECT account_status, availability_status FROM driver WHERE driver_id='${ID.D2}'`)).rows[0];
  check('suspension during an active trip does not interrupt it (driver stays Busy)', mid.account_status === 'Suspended' && mid.availability_status === 'Busy', mid);
  const fin = await svc((tx) => attempt(() => tx.query(`UPDATE driver SET availability_status='Available' WHERE driver_id='${ID.D2}'`)));
  const post = (await db.query(`SELECT availability_status FROM driver WHERE driver_id='${ID.D2}'`)).rows[0];
  check('when the trip ends the suspended driver is forced Offline instead of Available', fin.ok && fin.value.rowCount === 1 && post.availability_status === 'Offline', { fin, post });

  console.log('\nBypass attempts');
  const selfLift = await as(ID.D_AUTH, (tx) => attempt(() => tx.query(`UPDATE driver SET suspended_until = NULL, suspension_kind = NULL, account_status = 'Verified' WHERE driver_id='${ID.D1}'`)));
  check('a suspended driver cannot lift their own suspension through the API', !selfLift.ok, selfLift);
  const selfStrikes = await as(ID.P2_AUTH, (tx) => attempt(() => tx.query(`UPDATE passenger SET strikes_count = 0 WHERE passenger_id='${ID.P2}'`)));
  check('a passenger cannot zero their own strike counter', !selfStrikes.ok || (await db.query(`SELECT strikes_count FROM passenger WHERE passenger_id='${ID.P2}'`)).rows[0].strikes_count === 10, selfStrikes);
  const rpcNone = await as(ID.P2_AUTH, (tx) => attempt(() => tx.query(`SELECT public.sweep_strike_state()`)));
  check('a client cannot run the sweep', !rpcNone.ok, rpcNone);
  const anon = await asUser(db, { role: 'anon' }, (tx) => attempt(() => tx.query(`SELECT public.issue_strike('passenger','${ID.P1}','PAX_LATE_CANCEL')`)), { commit: true });
  check('the anonymous role cannot call the engine', !anon.ok, anon);

  console.log('\nPI-09 cancellation trigger re-pointed to the engine');
  await db.exec(`UPDATE booking SET booking_status='Assigned', driver_id=NULL WHERE booking_id='d0000000-0000-0000-0000-000000000001'`);
  const before = (await db.query(`SELECT strikes_count FROM passenger WHERE passenger_id='${ID.P1}'`)).rows[0].strikes_count;
  await db.exec(`INSERT INTO booking(booking_id,passenger_id,passenger_count,pickup_address,pickup_latitude,pickup_longitude,dropoff_address,dropoff_latitude,dropoff_longitude,booking_status)
    VALUES ('d0000000-0000-0000-0000-000000000002','${ID.P1}',1,'A',13.4115,121.1803,'B',13.42,121.19,'Assigned')`);
  await as(ID.P_AUTH, (tx) => tx.query(`UPDATE booking SET booking_status='Cancelled', cancelled_by='passenger', cancellation_reason='changed mind' WHERE booking_id='d0000000-0000-0000-0000-000000000002'`));
  const after = (await db.query(`SELECT strikes_count FROM passenger WHERE passenger_id='${ID.P1}'`)).rows[0].strikes_count;
  const viaEngine = (await db.query(`SELECT count(*)::int n FROM strikes_ledger WHERE idempotency_key='PAX_LATE_CANCEL:d0000000-0000-0000-0000-000000000002'`)).rows[0].n;
  check('a passenger cancelling an assigned booking now goes through issue_strike (and no longer errors)', viaEngine === 1 && after === before + 1, { before, after, viaEngine });
  await db.exec(`INSERT INTO booking(booking_id,passenger_id,passenger_count,pickup_address,pickup_latitude,pickup_longitude,dropoff_address,dropoff_latitude,dropoff_longitude,booking_status)
    VALUES ('d0000000-0000-0000-0000-000000000003','${ID.P1}',1,'A',13.4115,121.1803,'B',13.42,121.19,'Assigned')`);
  await svc((tx) => tx.query(`UPDATE booking SET booking_status='Cancelled', cancelled_by='system' WHERE booking_id='d0000000-0000-0000-0000-000000000003'`));
  check('system cancellations never strike the passenger (12.6)', (await db.query(`SELECT count(*)::int n FROM strikes_ledger WHERE idempotency_key LIKE 'PAX_LATE_CANCEL:%0003'`)).rows[0].n === 0);

  process.exit(summary() ? 0 : 1);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
