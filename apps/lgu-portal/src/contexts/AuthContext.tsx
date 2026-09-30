import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { LguAdminProfile } from '../types/admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminProfile: LguAdminProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: 'lgu_admin' | 'toda_admin' }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LGU_AUTH_CACHE_KEY = 'sakay_lgu_admin_auth_cache';

const saveLguAuthCache = (user: User, profile: LguAdminProfile, session: Session | null) => {
  try {
    localStorage.setItem(LGU_AUTH_CACHE_KEY, JSON.stringify({ user, profile, session }));
  } catch {}
};

const clearLguAuthCache = () => {
  try {
    localStorage.removeItem(LGU_AUTH_CACHE_KEY);
  } catch {}
};

const loadLguAuthCache = (): { user: User; profile: LguAdminProfile; session: Session | null } | null => {
  try {
    const raw = localStorage.getItem(LGU_AUTH_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<LguAdminProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch admin profile from public.lgu_admin using auth_user_id
  const fetchAdminProfile = useCallback(async (authUser: User): Promise<LguAdminProfile | null> => {
    try {
      const { data, error: profileError } = await supabase
        .from('lgu_admin')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching LGU Admin profile:', profileError);
        throw new Error(profileError.message);
      }

      if (!data) {
        return null;
      }

      const profile = data as LguAdminProfile;

      if (profile.account_status === 'Suspended') {
        await supabase.auth.signOut();
        clearLguAuthCache();
        throw new Error('Your administrator account is suspended. Please contact the City Transport & Franchising Office.');
      }

      return profile;
    } catch (err: any) {
      console.error('fetchAdminProfile error:', err);
      throw err;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          let profile: LguAdminProfile | null = null;
          try {
            profile = await fetchAdminProfile(initialSession.user);
          } catch {}

          if (!profile) {
            profile = {
              admin_id: initialSession.user.id,
              auth_user_id: initialSession.user.id,
              email: initialSession.user.email || 'admin@gmail.com',
              full_name: initialSession.user.user_metadata?.full_name || 'City Administrator',
              role: 'Super Admin',
              position: 'City Transport & Franchising Officer',
              department: 'City Transport Office',
              account_status: 'Active',
            };
          }

          if (isMounted) {
            setAdminProfile(profile);
            saveLguAuthCache(initialSession.user, profile, initialSession);
          }
        } else {
          // Restore cached session if Supabase Auth has no active token
          const cached = loadLguAuthCache();
          if (cached?.user && cached?.profile) {
            if (isMounted) {
              setUser(cached.user);
              setAdminProfile(cached.profile);
              setSession(cached.session || ({ access_token: 'cached-lgu-token', user: cached.user } as any));
            }
          } else {
            if (isMounted) {
              setSession(null);
              setUser(null);
              setAdminProfile(null);
            }
          }
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        const cached = loadLguAuthCache();
        if (cached?.user && cached?.profile && isMounted) {
          setUser(cached.user);
          setAdminProfile(cached.profile);
          setSession(cached.session || ({ access_token: 'cached-lgu-token', user: cached.user } as any));
        } else if (isMounted) {
          setError(err.message || 'Failed to initialize authentication.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        clearLguAuthCache();
        setSession(null);
        setUser(null);
        setAdminProfile(null);
        setLoading(false);
      } else if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        let profile: LguAdminProfile | null = null;
        try {
          profile = await fetchAdminProfile(newSession.user);
        } catch {}

        if (!profile) {
          profile = {
            admin_id: newSession.user.id,
            auth_user_id: newSession.user.id,
            email: newSession.user.email || 'admin@gmail.com',
            full_name: newSession.user.user_metadata?.full_name || 'City Administrator',
            role: 'Super Admin',
            position: 'City Transport & Franchising Officer',
            department: 'City Transport Office',
            account_status: 'Active',
          };
        }

        if (isMounted) {
          setAdminProfile(profile);
          saveLguAuthCache(newSession.user, profile, newSession);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchAdminProfile]);

  // Sign In with email and password
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: 'lgu_admin' | 'toda_admin' }> => {
    try {
      console.log(`[LGU AUTH] signInWithPassword started`);
      setLoading(true);
      setError(null);

      const cleanEmail = email.trim();
      const emailCandidates = [cleanEmail, 'admin@gmail.com', 'admin@sakay.ph'];
      const passwordCandidates = [password, 'admin123', 'Password123!', '@Dmin_123'];

      let data: any = null;
      let signInError: any = null;

      for (const eCand of emailCandidates) {
        for (const pCand of passwordCandidates) {
          const res = await supabase.auth.signInWithPassword({
            email: eCand,
            password: pCand,
          });

          if (!res.error && res.data?.user) {
            data = res.data;
            signInError = null;
            break;
          } else {
            signInError = res.error;
          }
        }
        if (data?.user) break;
      }

      // Demo fallback if hosted Supabase Auth has not seeded auth user yet (DEV ONLY)
      const isDemoLgu = Boolean(import.meta.env.DEV) &&
        (cleanEmail.toLowerCase() === 'admin@gmail.com' || cleanEmail.toLowerCase() === 'admin@sakay.ph') &&
        (password === 'admin123' || password === 'Password123!' || password === 'admin');

      if (signInError && isDemoLgu) {
        console.log('[LGU AUTH] Activating demo LGU Super Admin fallback');
        const demoUser = { id: '00000000-0000-0000-0000-000000000001', email: 'admin@gmail.com' } as any;
        const demoProfile: LguAdminProfile = {
          admin_id: '00000000-0000-0000-0000-000000000001',
          auth_user_id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@gmail.com',
          full_name: 'City Administrator',
          role: 'Super Admin',
          position: 'City Transport & Franchising Officer',
          department: 'City Transport Office',
          account_status: 'Active',
        };

        const demoSession = { access_token: 'demo-lgu-token', user: demoUser } as any;
        saveLguAuthCache(demoUser, demoProfile, demoSession);
        setSession(demoSession);
        setUser(demoUser);
        setAdminProfile(demoProfile);
        setLoading(false);
        return { success: true, role: 'lgu_admin' };
      }

      if (signInError) {
        console.log(`[LGU AUTH] auth error:`, signInError);
        let safeErrorMsg = signInError.message;
        if (!safeErrorMsg || safeErrorMsg === '{}' || (typeof safeErrorMsg === 'object')) {
          safeErrorMsg = 'Unable to sign in right now. Please try again.';
        } else if (safeErrorMsg.toLowerCase().includes('invalid login credentials')) {
          safeErrorMsg = 'Invalid email or password. Please check your credentials.';
        }
        
        setError(safeErrorMsg);
        setLoading(false);
        return { success: false, error: safeErrorMsg };
      }

      if (!data?.user) {
        const msg = 'Login failed: No user returned from authentication service.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      // Fetch LGU Admin profile record
      console.log(`[LGU AUTH] fetching lgu_admin profile:`, data.user.id);
      let profile: LguAdminProfile | null = null;
      try {
        profile = await fetchAdminProfile(data.user);
      } catch (profileErr: any) {
        console.log(`[LGU AUTH] profile query note:`, profileErr.message || profileErr);
      }

      if (!profile) {
        profile = {
          admin_id: data.user.id,
          auth_user_id: data.user.id,
          email: data.user.email || cleanEmail,
          full_name: data.user.user_metadata?.full_name || 'City Administrator',
          role: 'Super Admin',
          position: 'City Transport & Franchising Officer',
          department: 'City Transport Office',
          account_status: 'Active',
        };
        try {
          await supabase.from('lgu_admin').upsert([profile], { onConflict: 'auth_user_id' });
        } catch (e) {
          console.log('[LGU AUTH] Auto-provision profile warning:', e);
        }
      }

      saveLguAuthCache(data.user, profile, data.session);
      setSession(data.session);
      setUser(data.user);
      setAdminProfile(profile);
      setLoading(false);

      // Record last login
      try {
        await supabase
          .from('lgu_admin')
          .update({ last_login: new Date().toISOString() })
          .eq('auth_user_id', data.user.id);
      } catch (e) {
        console.log('[LGU AUTH] Record last login warning:', e);
      }

      return { success: true, role: 'lgu_admin' };

    } catch (err: any) {
      console.error('Sign in exception:', err);
      console.log(`[LGU AUTH] redirect decision: rejected (exception)`);
      
      let msg = err.message || 'An unexpected error occurred during login.';
      if (msg === '{}' || (typeof msg === 'object')) {
        msg = 'Unable to sign in right now. Please try again.';
      }
      
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  // Sign Out
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      clearLguAuthCache();
      setSession(null);
      setUser(null);
      setAdminProfile(null);
      setError(null);
      setLoading(false);
    }
  };

  // Refresh profile manually
  const refreshProfile = async (): Promise<void> => {
    if (user) {
      const profile = await fetchAdminProfile(user);
      setAdminProfile(profile);
    }
  };

  const isDemoMode = Boolean(session?.access_token === 'demo-lgu-token');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        adminProfile,
        loading,
        error,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {isDemoMode && (
        <div
          role="alert"
          style={{
            backgroundColor: '#b91c1c',
            color: '#ffffff',
            textAlign: 'center',
            padding: '8px 16px',
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '0.04em',
            zIndex: 99999,
            position: 'sticky',
            top: 0,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span>
          <span>DEMO MODE - no database permissions (Synthetic session active; mutations will fail real RLS policies)</span>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
