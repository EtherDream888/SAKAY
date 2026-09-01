import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Critical Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing from environment variables.');
}

// Single source of truth typed Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize real-time cross-port and cross-device dispatch synchronization
import { initSupabaseDispatch } from '@sakay/shared';
initSupabaseDispatch(supabase);
