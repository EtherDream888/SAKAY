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
          const { data: directToda } = await supabase
            .from('toda')
            .select('*')
            .eq('toda_id', data.toda_id)
            .maybeSingle();
          todaData = directToda;
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
          query = query.eq('toda_acronym', targetAcronym);
        }

        const { data: todaRecord } = await query.maybeSingle();

        if (todaRecord) {
          return {
            admin_id: authUser.id,
            auth_user_id: authUser.id,
            toda_id: todaRecord.toda_id,
            full_name: authUser.user_metadata?.full_name || todaRecord.president_name || 'TODA Administrator',
            email: authUser.email || `${todaRecord.toda_acronym.toLowerCase()}@toda.sakay.internal`,
            contact_number: todaRecord.president_contact || '',
            account_status: 'Active',
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

        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!isMounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          try {
            const profile = await fetchTodaAdminProfile(initialSession.user);
            if (isMounted) {
              if (profile) {
                setTodaAdminProfile(profile);
              } else {
                setTodaAdminProfile(null);
                setError('Unauthorized: Your credentials are not linked to an accredited TODA Administrator profile.');
              }
            }
          } catch (profileErr: any) {
            if (isMounted) {
              setTodaAdminProfile(null);
              setError(profileErr.message || 'Failed to retrieve TODA administrator profile.');
            }
          }
        } else {
          setSession(null);
          setUser(null);
          setTodaAdminProfile(null);
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
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

      if (event === 'SIGNED_OUT' || !newSession) {
        setSession(null);
        setUser(null);
        setTodaAdminProfile(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession.user);

        if (newSession.user) {
          try {
            const profile = await fetchTodaAdminProfile(newSession.user);
            if (isMounted) {
              setTodaAdminProfile(profile);
            }
          } catch (profileErr: any) {
            if (isMounted) {
              setTodaAdminProfile(null);
              setError(profileErr.message);
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
        ? cleanInput
        : `${cleanInput.toLowerCase()}@toda.sakay.internal`;

      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      // Seamless fallback for CCTODA if hosted database user is provisioned as admin@gmail.com
      if (signInError && (cleanInput.toUpperCase() === 'CCTODA' || cleanInput.toLowerCase() === 'cctoda')) {
        const fallbackRes = await supabase.auth.signInWithPassword({
          email: 'admin@gmail.com',
          password,
        });
        if (!fallbackRes.error && fallbackRes.data.user) {
          data = fallbackRes.data;
          signInError = null;
        }
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

      if (!data.user) {
        const msg = 'Login failed: No user returned from authentication service.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      // Fetch TODA Admin profile record
      const profile = await fetchTodaAdminProfile(data.user);

      if (!profile) {
        await supabase.auth.signOut();
        const msg = 'Access Denied: Your account is not registered as a TODA Administrator.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

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
