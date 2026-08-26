import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://thxcltvgwwluvsfpciyr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGNsdHZnd3dsdXZzZnBjaXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyODE4NDQsImV4cCI6MjA5OTg1Nzg0NH0.wDqoMM8RoZKgJPbIBU2xDu8GWCqYpNDlR1V9JKd7Voo';

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
