const { Client } = require('pg');

const DATABASE_URL = "postgresql://postgres:S@k@y_@rangk@d@@db.thxcltvgwwluvsfpciyr.supabase.co:5432/postgres";

async function forceDeletePhone(inputPhone) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const cleanDigits = inputPhone.replace(/\D/g, '');
    let afterPrefix = '';
    if (cleanDigits.startsWith('09')) afterPrefix = cleanDigits.slice(2);
    else if (cleanDigits.startsWith('639')) afterPrefix = cleanDigits.slice(3);
    else if (cleanDigits.startsWith('9')) afterPrefix = cleanDigits.slice(1);
    else if (cleanDigits.startsWith('0')) afterPrefix = cleanDigits.slice(1);
    else afterPrefix = cleanDigits;

    afterPrefix = afterPrefix.slice(0, 9);
    if (!afterPrefix) throw new Error("Invalid phone number format");

    const phone = '09' + afterPrefix;
    const raw = '9' + afterPrefix;
    const e164 = '+639' + afterPrefix;
    const phone63 = '639' + afterPrefix;
    const syntheticEmail = `passenger_${phone63}@sakay.ph`;

    console.log(`\nDeleting phone variants: ${phone}, ${raw}, ${e164}, ${phone63}, email: ${syntheticEmail}`);

    // 0. Find the passenger IDs
    const passRes = await client.query(`
      SELECT passenger_id, auth_user_id FROM public.passenger
      WHERE contact_number IN ($1, $2, $3, $4);
    `, [phone, raw, e164, phone63]);

    const passengerIds = passRes.rows.map(r => r.passenger_id);
    const authUserIds = passRes.rows.map(r => r.auth_user_id).filter(Boolean);

    if (passengerIds.length > 0) {
      console.log(`Found passengers to delete:`, passengerIds);

      // Delete associated bookings
      console.log('Deleting from public.booking...');
      const bookingsRes = await client.query(`
        DELETE FROM public.booking
        WHERE passenger_id = ANY($1::uuid[])
        RETURNING booking_id;
      `, [passengerIds]);
      console.log(`Deleted ${bookingsRes.rowCount} row(s) from booking table.`);

      // 1. Delete from public.passenger
      console.log('Deleting from public.passenger...');
      const passengerRes = await client.query(`
        DELETE FROM public.passenger
        WHERE passenger_id = ANY($1::uuid[])
        RETURNING passenger_id, contact_number, auth_user_id;
      `, [passengerIds]);
      console.log(`Deleted ${passengerRes.rowCount} row(s) from passenger table.`);
    } else {
      console.log('No matching passenger rows found.');
    }

    // 2. Delete from auth.users
    console.log('\nDeleting from auth.users...');
    let authQuery = `
      DELETE FROM auth.users
      WHERE phone IN ($1, $2, $3, $4)
         OR email = $5
    `;
    const params = [phone, raw, e164, phone63, syntheticEmail];

    if (authUserIds.length > 0) {
      authQuery += ` OR id = ANY($6::uuid[])`;
      params.push(authUserIds);
    }
    
    authQuery += ` RETURNING id, phone, email;`;

    const authRes = await client.query(authQuery, params);
    console.log(`Deleted ${authRes.rowCount} row(s) from auth.users table.`);
    authRes.rows.forEach(r => console.log('  ->', r));

    // 3. Double check passenger
    const checkPass = await client.query(`
      SELECT passenger_id FROM public.passenger
      WHERE contact_number IN ($1, $2, $3, $4);
    `, [phone, raw, e164, phone63]);
    console.log(`\nRemaining passenger rows: ${checkPass.rowCount}`);

    // 4. Double check auth
    const checkAuth = await client.query(`
      SELECT id FROM auth.users
      WHERE phone IN ($1, $2, $3, $4) OR email = $5;
    `, [phone, raw, e164, phone63, syntheticEmail]);
    console.log(`Remaining auth.users rows: ${checkAuth.rowCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

const inputPhone = process.argv[2];
if (!inputPhone) {
  console.log("Please provide a phone number as an argument. Example: node forceDeletePhoneSql.js '0960 693 8525'");
  process.exit(1);
}

forceDeletePhone(inputPhone);
