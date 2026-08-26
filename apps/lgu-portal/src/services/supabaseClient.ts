import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Critical Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing from environment variables.');
}

const customStorage = {
  getItem: (key: string) => {
    const rememberMe = window.localStorage.getItem('sakay_remember_me') === 'true';
    return rememberMe ? window.localStorage.getItem(key) : window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    const rememberMe = window.localStorage.getItem('sakay_remember_me') === 'true';
    if (rememberMe) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

// Supabase client instance for LGU Admin Portal
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
