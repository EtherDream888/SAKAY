import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const phone = '09606938525';

async function resetPhone() {
  // 1️⃣ Delete passenger row (if it exists)
  const { error: passengerError } = await supabase
    .from('passenger')
    .delete()
    .eq('contact_number', phone);
  if (passengerError) {
    console.error('❌ Failed to delete passenger record:', passengerError);
  } else {
    console.log('✅ Passenger record removed (if it existed).');
  }

  // 2️⃣ Remove the auth user linked to this phone number.
  // Supabase Auth stores the phone in the "phone" column of auth.users.
  const { data: users, error: usersError } = await supabase
    .from('auth.users')
    .select('id')
    .eq('phone', phone);

  if (usersError) {
    console.error('❌ Failed to query auth.users:', usersError);
    return;
  }

  if (users && users.length > 0) {
    for (const { id } of users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
      if (deleteError) {
        console.error(`❌ Failed to delete auth user ${id}:`, deleteError);
      } else {
        console.log(`✅ Auth user ${id} deleted.`);
      }
    }
  } else {
    console.log('ℹ️ No auth user found for the provided phone number.');
  }
}

resetPhone().then(() => process.exit());
