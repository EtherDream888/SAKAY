import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const phone = '09606938525';

async function verify() {
  const { data: passenger, error: pErr } = await supabase
    .from('passenger')
    .select('id')
    .eq('contact_number', phone);
  if (pErr) console.error('Passenger query error:', pErr);
  else console.log('Passenger rows:', passenger?.length ?? 0);

  const { data: users, error: uErr } = await supabase
    .from('auth.users')
    .select('id')
    .eq('phone', phone);
  if (uErr) console.error('Auth users query error:', uErr);
  else console.log('Auth users rows:', users?.length ?? 0);
}

verify().then(() => process.exit());
