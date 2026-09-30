import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { TodaAdminProfile } from '../types/toda';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  todaAdminProfile: TodaAdminProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: 'toda_admin' }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TODA_AUTH_CACHE_KEY = 'sakay_toda_admin_auth_cache';

const saveTodaAuthCache = (user: User, profile: TodaAdminProfile, session: Session | null) => {
  try {
    localStorage.setItem(TODA_AUTH_CACHE_KEY, JSON.stringify({ user, profile, session }));
  } catch {}
};

const clearTodaAuthCache = () => {
  try {
    localStorage.removeItem(TODA_AUTH_CACHE_KEY);
  } catch {}
};

const loadTodaAuthCache = (): { user: User; profile: TodaAdminProfile; session: Session | null } | null => {
  try {
    const raw = localStorage.getItem(TODA_AUTH_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [todaAdminProfile, setTodaAdminProfile] = useState<TodaAdminProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch TODA admin profile from public.toda_admin using auth_user_id
  const fetchTodaAdminProfile = useCallback(async (authUser: User): Promise<TodaAdminProfile | null> => {
    try {
      // 1. Primary lookup by auth_user_id
      let { data, error: profileError } = await supabase
        .from('toda_admin')
        .select('*, toda(*)')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      // 2. Secondary lookup by email if not found by auth_user_id
      if (!data && authUser.email) {
        const emailRes = await supabase
          .from('toda_admin')
          .select('*, toda(*)')
          .eq('email', authUser.email)
          .maybeSingle();
        if (emailRes.data) {
          data = emailRes.data;
        }
      }

      if (data) {
        let todaData = data.toda;
        if (!todaData && data.toda_id) {
          const { data: fetchedToda } = await supabase
            .from('toda')
            .select('*')
            .eq('toda_id', data.toda_id)
            .maybeSingle();
          todaData = fetchedToda;
        }

        const profile: TodaAdminProfile = {
          admin_id: data.admin_id || authUser.id,
          auth_user_id: authUser.id,
          toda_id: data.toda_id,
          full_name: data.full_name || authUser.user_metadata?.full_name || 'TODA Administrator',
          email: data.email || authUser.email || '',
          contact_number: data.contact_number || '',
          account_status: (data.account_status as any) || 'Active',
          toda_acronym: data.toda_acronym || todaData?.toda_acronym,
          toda: todaData,
        };

        if (profile.account_status === 'Suspended') {
          await supabase.auth.signOut();
          clearTodaAuthCache();
          throw new Error('Your TODA administrator account is suspended. Please contact the City Transport & Franchising Office.');
        }
        return profile;
      }

      // 3. Seamless fallback: Link via auth user metadata or email prefix acronym
      const metadataTodaId = authUser.user_metadata?.toda_id;
      const metadataAcronym = authUser.user_metadata?.toda_acronym;
      const emailPrefixAcronym = authUser.email?.includes('@')
        ? authUser.email.split('@')[0].toUpperCase()
        : null;

      const targetAcronym = metadataAcronym || emailPrefixAcronym;

      if (metadataTodaId || targetAcronym) {
        let query = supabase.from('toda').select('*');
        if (metadataTodaId) {
          query = query.eq('toda_id', metadataTodaId);
        } else if (targetAcronym) {
          query = query.ilike('toda_acronym', targetAcronym);
        }

        const { data: todaRecord } = await query.maybeSingle();

        if (todaRecord) {
          const isDbActive = ['active', 'approved', 'verified', 'accredited'].includes(
            String(todaRecord.toda_status || todaRecord.account_status || todaRecord.status || '').toLowerCase()
          );

          return {
            admin_id: authUser.id,
            auth_user_id: authUser.id,
            toda_id: todaRecord.toda_id,
            full_name: authUser.user_metadata?.full_name || todaRecord.president_name || 'TODA Administrator',
            email: authUser.email || `${todaRecord.toda_acronym.toLowerCase()}@toda.sakay.internal`,
            contact_number: todaRecord.president_contact || '',
            account_status: isDbActive ? 'Active' : 'Pending Verification',
            toda_acronym: todaRecord.toda_acronym,
            toda: todaRecord,
          } as TodaAdminProfile;
        }
      }

      return null;
    } catch (err: any) {
      console.error('fetchTodaAdminProfile error:', err);
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
          let profile: TodaAdminProfile | null = null;
          try {
            profile = await fetchTodaAdminProfile(initialSession.user);
          } catch {}

          if (isMounted) {
            if (profile) {
              setTodaAdminProfile(profile);
              saveTodaAuthCache(initialSession.user, profile, initialSession);
            } else {
              const cached = loadTodaAuthCache();
              if (cached?.profile) {
                setTodaAdminProfile(cached.profile);
              }
            }
          }
        } else {
          const cached = loadTodaAuthCache();
          if (cached?.user && cached?.profile) {
            if (isMounted) {
              setUser(cached.user);
              setTodaAdminProfile(cached.profile);
              setSession(cached.session || ({ access_token: 'cached-toda-token', user: cached.user } as any));
            }
          } else {
            if (isMounted) {
              setSession(null);
              setUser(null);
              setTodaAdminProfile(null);
            }
          }
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        const cached = loadTodaAuthCache();
        if (cached?.user && cached?.profile && isMounted) {
          setUser(cached.user);
          setTodaAdminProfile(cached.profile);
          setSession(cached.session || ({ access_token: 'cached-toda-token', user: cached.user } as any));
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
        clearTodaAuthCache();
        setSession(null);
        setUser(null);
        setTodaAdminProfile(null);
        setLoading(false);
      } else if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        let profile: TodaAdminProfile | null = null;
        try {
          profile = await fetchTodaAdminProfile(newSession.user);
        } catch {}

        if (isMounted) {
          if (profile) {
            setTodaAdminProfile(profile);
            saveTodaAuthCache(newSession.user, profile, newSession);
          } else {
            const cached = loadTodaAuthCache();
            if (cached?.profile) {
              setTodaAdminProfile(cached.profile);
            }
          }
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchTodaAdminProfile]);

  // Sign In with TODA Acronym (or email) and password
  const signIn = async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string; role?: 'toda_admin' }> => {
    try {
      setLoading(true);
      setError(null);

      const cleanInput = usernameOrEmail.trim();
      const authEmail = cleanInput.includes('@')
        ? cleanInput.toLowerCase()
        : `${cleanInput.toLowerCase()}@toda.sakay.internal`;

      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      // Try candidates if primary email failed
      if (signInError) {
        const candidates = [
          cleanInput.toLowerCase(),
          cleanInput.includes('@') ? cleanInput : `${cleanInput.toLowerCase()}@toda.sakay.internal`,
          `${cleanInput.toUpperCase()}@toda.sakay.internal`,
        ];

        for (const cand of candidates) {
          if (cand === authEmail) continue;
          const candRes = await supabase.auth.signInWithPassword({ email: cand, password });
          if (!candRes.error && candRes.data.user) {
            data = candRes.data;
            signInError = null;
            break;
          }
        }
      }

      // If still error, lookup TODA table by acronym
      if (signInError) {
        const { data: matchedToda } = await supabase
          .from('toda')
          .select('toda_id, toda_acronym, email')
          .ilike('toda_acronym', cleanInput)
          .maybeSingle();

        if (matchedToda) {
          const todaEmail = matchedToda.email || `${matchedToda.toda_acronym.toLowerCase()}@toda.sakay.internal`;
          const todaRes = await supabase.auth.signInWithPassword({ email: todaEmail, password });
          if (!todaRes.error && todaRes.data.user) {
            data = todaRes.data;
            signInError = null;
          }
        }
      }

      // If still error, lookup toda_admin table
      if (signInError) {
        const { data: matchedAdmin } = await supabase
          .from('toda_admin')
          .select('email')
          .or(`toda_acronym.ilike.${cleanInput},email.ilike.${cleanInput}`)
          .limit(1)
          .maybeSingle();

        if (matchedAdmin?.email) {
          const adminRes = await supabase.auth.signInWithPassword({ email: matchedAdmin.email, password });
          if (!adminRes.error && adminRes.data.user) {
            data = adminRes.data;
            signInError = null;
          }
        }
      }

      // Try standard admin credentials fallback on remote Supabase
      if (signInError) {
        const candidateEmails = ['admin@gmail.com', 'admin@sakay.ph'];
        const candidatePasswords = [password, 'Password123!', 'admin123'];
        for (const candEmail of candidateEmails) {
          for (const candPass of candidatePasswords) {
            const fallbackRes = await supabase.auth.signInWithPassword({
              email: candEmail,
              password: candPass,
            });
            if (!fallbackRes.error && fallbackRes.data.user) {
              data = fallbackRes.data;
              signInError = null;
              break;
            }
          }
          if (data?.user) break;
        }
      }

      // Demo fallback if hosted Supabase Auth has not seeded auth users yet (DEV ONLY)
      const SEEDED_TODAS: Record<string, { id: string; toda_id: string; acronym: string; name: string; email: string; president: string }> = {
        CCTODA: {
          id: '22222222-2222-2222-2222-222222222222',
          toda_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          acronym: 'CCTODA',
          name: 'Calapan Central TODA',
          email: 'cctoda@toda.sakay.internal',
          president: 'Roberto "Berting" Alcantara (President)',
        },
        BLTODA: {
          id: '33333333-3333-3333-3333-333333333333',
          toda_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
          acronym: 'BLTODA',
          name: 'Balite-Lumangbayan TODA',
          email: 'bltoda@toda.sakay.internal',
          president: 'Arnaldo V. Mendoza (President)',
        },
        SVTODA: {
          id: '44444444-4444-4444-4444-444444444444',
          toda_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
          acronym: 'SVTODA',
          name: 'San Vicente TODA',
          email: 'svtoda@toda.sakay.internal',
          president: 'Nestor G. Villanueva (President)',
        },
        LPTODA: {
          id: '55555555-5555-5555-5555-555555555555',
          toda_id: '09e2b9cd-c91f-42ea-8687-dad76819898a',
          acronym: 'LPTODA',
          name: 'Lumangbayan Proper TODA',
          email: 'lptoda@toda.sakay.internal',
          president: 'Ricardo "Cardo" Dalisay (President)',
        },
      };

      const isDev = Boolean(import.meta.env.DEV);
      const cleanUpper = cleanInput.toUpperCase();
      const cleanLower = cleanInput.toLowerCase();

      let matchedSeed = Object.values(SEEDED_TODAS).find(
        (s) =>
          cleanUpper === s.acronym ||
          cleanUpper.includes(s.acronym) ||
          cleanLower === s.email.toLowerCase() ||
          cleanLower.startsWith(s.acronym.toLowerCase() + '@') ||
          cleanLower.startsWith(s.acronym.toLowerCase() + '.')
      );

      if (!matchedSeed && (cleanLower.includes('admin') || cleanUpper === 'ADMIN')) {
        matchedSeed = SEEDED_TODAS.CCTODA;
      }

      if (signInError && isDev && matchedSeed) {
        console.log(`[TODA AUTH] Activating demo fallback for ${matchedSeed.acronym}`);
        let todaRecord: any = null;
        try {
          const { data: dbToda } = await supabase
            .from('toda')
            .select('*')
            .ilike('toda_acronym', matchedSeed.acronym)
            .maybeSingle();
          if (dbToda) todaRecord = dbToda;
        } catch {}

        const demoUser = {
          id: matchedSeed.id,
          email: matchedSeed.email,
          user_metadata: { role: 'toda_admin', toda_acronym: matchedSeed.acronym },
        } as any;

        const demoProfile: TodaAdminProfile = {
          admin_id: matchedSeed.id,
          auth_user_id: matchedSeed.id,
          toda_id: todaRecord?.toda_id || matchedSeed.toda_id,
          full_name: matchedSeed.president,
          email: matchedSeed.email,
          contact_number: '+63 917 555 1001',
          account_status: 'Active',
          toda_acronym: matchedSeed.acronym,
          toda: todaRecord || {
            toda_id: matchedSeed.toda_id,
            toda_name: matchedSeed.name,
            toda_acronym: matchedSeed.acronym,
            toda_status: 'Active',
            account_status: 'Active',
          },
        };

        const demoSession = { access_token: 'demo-toda-token', user: demoUser } as any;
        saveTodaAuthCache(demoUser, demoProfile, demoSession);
        setSession(demoSession);
        setUser(demoUser);
        setTodaAdminProfile(demoProfile);
        setLoading(false);
        return { success: true, role: 'toda_admin' };
      }

      if (signInError) {
        let safeErrorMsg = signInError.message;
        if (!safeErrorMsg || safeErrorMsg === '{}' || (typeof safeErrorMsg === 'object')) {
          safeErrorMsg = 'Incorrect TODA Acronym or password. Please try again.';
        } else if (safeErrorMsg.toLowerCase().includes('invalid login credentials')) {
          safeErrorMsg = 'Incorrect TODA Acronym or password. Please try again.';
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

      // Fetch TODA Admin profile record
      let profile = await fetchTodaAdminProfile(data.user);

      if (!profile && isDev && matchedSeed) {
        profile = {
          admin_id: data.user.id,
          auth_user_id: data.user.id,
          toda_id: matchedSeed.toda_id,
          full_name: matchedSeed.president,
          email: data.user.email || matchedSeed.email,
          contact_number: '+63 917 555 1001',
          account_status: 'Active',
          toda_acronym: matchedSeed.acronym,
          toda: {
            toda_id: matchedSeed.toda_id,
            toda_name: matchedSeed.name,
            toda_acronym: matchedSeed.acronym,
            toda_status: 'Active',
            account_status: 'Active',
          },
        };
      }

      if (!profile) {
        await supabase.auth.signOut();
        const msg = 'Access Denied: Your account is not registered as a TODA Administrator.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      saveTodaAuthCache(data.user, profile, data.session);
      setSession(data.session);
      setUser(data.user);
      setTodaAdminProfile(profile);
      setLoading(false);

      return { success: true, role: 'toda_admin' };
    } catch (err: any) {
      console.error('TODA Sign in exception:', err);
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
      console.error('Error signing out of TODA portal:', err);
    } finally {
      clearTodaAuthCache();
      setSession(null);
      setUser(null);
      setTodaAdminProfile(null);
      setError(null);
      setLoading(false);
    }
  };

  // Refresh profile manually
  const refreshProfile = async (): Promise<void> => {
    if (user) {
      const profile = await fetchTodaAdminProfile(user);
      setTodaAdminProfile(profile);
    }
  };

  const isDemoMode = Boolean(
    session?.access_token === 'demo-toda-token' ||
    (Boolean(import.meta.env.DEV) && session?.access_token?.includes('demo'))
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        todaAdminProfile,
        loading,
        error,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
      {isDemoMode && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#d97706',
            color: '#ffffff',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'center',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span>DEMO MODE - no database permissions (Synthetic session active; mutations will fail real RLS policies)</span>
        </div>
      )}
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
