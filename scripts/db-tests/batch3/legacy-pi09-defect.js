// Executes the ORIGINAL (Batch 2) PI-09 trigger to confirm the defect found by reading in Phase A.
const { freshDb, asUser, attempt, check, summary } = require('../tlib');
const { ID, seed } = require('../fixtures');

(async () => {
  const db = await freshDb('20261003000006_pi09_booking_abuse_strikes.sql');   // chain through Batch 2, NOT Batch 3
  await seed(db);
  await db.exec(`UPDATE passenger SET strike_count = 2 WHERE passenger_id='${ID.P1}';
    INSERT INTO booking(booking_id,passenger_id,passenger_count,pickup_address,pickup_latitude,pickup_longitude,dropoff_address,dropoff_latitude,dropoff_longitude,booking_status)
    VALUES ('d0000000-0000-0000-0000-000000000009','${ID.P1}',1,'A',13.4115,121.1803,'B',13.42,121.19,'Assigned')`);
  const r = await asUser(db, { uid: ID.P_AUTH }, (tx) => attempt(() => tx.query(
    `UPDATE booking SET booking_status='Cancelled', cancelled_by='passenger' WHERE booking_id='d0000000-0000-0000-0000-000000000009'`)));
  console.log('Old PI-09 behaviour, passenger at 2 strikes cancels an Assigned booking (3rd strike):');
  console.log('  result:', r.ok ? 'succeeded' : 'ERROR -> ' + r.error);
  check('ORIGINAL trigger blocked the passenger\'s own cancellation (protect_read_only_columns)', !r.ok && /cannot modify their own account_status/.test(r.error), r);
  const ns = await asUser(db, { uid: ID.P_AUTH }, (tx) => attempt(() => tx.query(
    `UPDATE booking SET booking_status='Cancelled', cancelled_by='passenger' WHERE booking_id='d0000000-0000-0000-0000-000000000009'`)));
  process.exit(summary() ? 0 : 1);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
