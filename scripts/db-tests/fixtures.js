// Shared fixtures for Batch 3 tests.
const ID = {
  P_AUTH: '10000000-0000-0000-0000-000000000001', P1: 'a0000000-0000-0000-0000-000000000001',
  P2_AUTH: '10000000-0000-0000-0000-000000000002', P2: 'a0000000-0000-0000-0000-000000000002',
  D_AUTH: '20000000-0000-0000-0000-000000000001', D1: 'b0000000-0000-0000-0000-000000000001',
  D2_AUTH: '20000000-0000-0000-0000-000000000002', D2: 'b0000000-0000-0000-0000-000000000002',
  D3_AUTH: '20000000-0000-0000-0000-000000000003', D3: 'b0000000-0000-0000-0000-000000000003',
  L_AUTH: '30000000-0000-0000-0000-000000000001',
  T_AUTH: '40000000-0000-0000-0000-000000000001', T2_AUTH: '40000000-0000-0000-0000-000000000002',
  TODA1: 'c0000000-0000-0000-0000-000000000001', TODA2: 'c0000000-0000-0000-0000-000000000002',
};

async function seed(db) {
  const users = ['P_AUTH', 'P2_AUTH', 'D_AUTH', 'D2_AUTH', 'D3_AUTH', 'L_AUTH', 'T_AUTH', 'T2_AUTH']
    .map((k, i) => `('${ID[k]}','u${i}@x.com')`).join(',');
  await db.exec(`
    INSERT INTO auth.users(id,email) VALUES ${users};
    INSERT INTO public.toda(toda_id,toda_name) VALUES
      ('${ID.TODA1}','Toda One'),('${ID.TODA2}','Toda Two');
    INSERT INTO public.passenger(passenger_id,auth_user_id,full_name,contact_number,account_status) VALUES
      ('${ID.P1}','${ID.P_AUTH}','Pax One','+639170000001','Active'),
      ('${ID.P2}','${ID.P2_AUTH}','Pax Two','+639170000002','Active');
    INSERT INTO public.driver(driver_id,auth_user_id,full_name,contact_number,account_status,availability_status,toda_id) VALUES
      ('${ID.D1}','${ID.D_AUTH}','Driver One','+639180000001','Verified','Offline','${ID.TODA1}'),
      ('${ID.D2}','${ID.D2_AUTH}','Driver Two','+639180000002','Verified','Offline','${ID.TODA1}'),
      ('${ID.D3}','${ID.D3_AUTH}','Driver Three','+639180000003','Verified','Offline','${ID.TODA2}');
    INSERT INTO public.lgu_admin(auth_user_id,full_name,email) VALUES ('${ID.L_AUTH}','LGU Admin','l@x.com');
    INSERT INTO public.toda_admin(auth_user_id,toda_id,full_name,email) VALUES
      ('${ID.T_AUTH}','${ID.TODA1}','Toda1 Admin','t1@x.com'),
      ('${ID.T2_AUTH}','${ID.TODA2}','Toda2 Admin','t2@x.com');
  `);
}

module.exports = { ID, seed };
