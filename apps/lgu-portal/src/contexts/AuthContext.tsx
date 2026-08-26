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
        // No matching lgu_admin record found
        return null;
      }

      const profile = data as LguAdminProfile;

      // Check account status
      if (profile.account_status === 'Suspended') {
        await supabase.auth.signOut();
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

        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!isMounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          try {
            const profile = await fetchAdminProfile(initialSession.user);
            if (isMounted) {
              if (profile) {
                setAdminProfile(profile);
                // Update last_login timestamp in background
                supabase
                  .from('lgu_admin')
                  .update({ last_login: new Date().toISOString() })
                  .eq('auth_user_id', initialSession.user.id)
                  .then(() => {});
              } else {
                setAdminProfile(null);
                setError('Unauthorized: Your credentials are not linked to an accredited LGU Administrator profile.');
              }
            }
          } catch (profileErr: any) {
            if (isMounted) {
              setAdminProfile(null);
              setError(profileErr.message || 'Failed to retrieve administrator profile.');
            }
          }
        } else {
          setSession(null);
          setUser(null);
          setAdminProfile(null);
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
        setAdminProfile(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession.user);
        
        if (newSession.user) {
          try {
            const profile = await fetchAdminProfile(newSession.user);
            if (isMounted) {
              setAdminProfile(profile);
            }
          } catch (profileErr: any) {
            if (isMounted) {
              setAdminProfile(null);
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
  }, [fetchAdminProfile]);

  // Sign In with email and password
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: 'lgu_admin' | 'toda_admin' }> => {
    try {
      console.log(`[LGU AUTH] signInWithPassword started`);
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        console.log(`[LGU AUTH] auth error:`, signInError);
        console.log(`[LGU AUTH] auth error code:`, (signInError as any).code);
        console.log(`[LGU AUTH] auth error message:`, signInError.message);
        
        let safeErrorMsg = signInError.message;
        if (!safeErrorMsg || safeErrorMsg === '{}' || (typeof safeErrorMsg === 'object')) {
          safeErrorMsg = 'Unable to sign in right now. Please try again.';
        }
        
        setError(safeErrorMsg);
        setLoading(false);
        return { success: false, error: safeErrorMsg };
      }

      console.log(`[LGU AUTH] auth error: null`);
      console.log(`[LGU AUTH] session received:`, !!data.session);
      console.log(`[LGU AUTH] user id:`, data.user?.id);

      if (!data.user) {
        const msg = 'Login failed: No user returned from authentication service.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      // Fetch LGU Admin profile record
      console.log(`[LGU AUTH] fetching lgu_admin profile:`, data.user.id);
      let profile = null;
      try {
        profile = await fetchAdminProfile(data.user);
        console.log(`[LGU AUTH] profile query error: null`);
      } catch (profileErr: any) {
        console.log(`[LGU AUTH] profile query error:`, profileErr.message || profileErr);
        throw profileErr; // Let the outer catch handle it
      }
      
      console.log(`[LGU AUTH] profile:`, profile ? 'found' : 'not found');

      if (profile) {
        console.log(`[LGU AUTH] account status:`, profile.account_status);
        console.log(`[LGU AUTH] position:`, profile.position);
        
        if (profile.account_status !== 'Active') {
           console.log(`[LGU AUTH] redirect decision: rejected (inactive)`);
        } else {
           console.log(`[LGU AUTH] redirect decision: allowed (lgu_dashboard)`);
        }
        
        setSession(data.session);
        setUser(data.user);
        setAdminProfile(profile);
        setLoading(false);

        // Record last login
        await supabase
          .from('lgu_admin')
          .update({ last_login: new Date().toISOString() })
          .eq('auth_user_id', data.user.id);

        return { success: true, role: 'lgu_admin' };
      }
      
      // If not LGU Admin, check TODA Admin
      const { data: todaProfile, error: todaError } = await supabase
        .from('toda_admin')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();
        
      if (todaProfile && !todaError) {
        if (todaProfile.account_status === 'Suspended') {
          await supabase.auth.signOut();
          const msg = 'Your TODA administrator account is suspended. Please contact the City Transport Office.';
          setError(msg);
          setLoading(false);
          return { success: false, error: msg };
        }
        
        // Let them log in, return toda_admin so the login page can redirect
        // Note: we don't set adminProfile here because AuthContext type is strictly LguAdminProfile
        setLoading(false);
        return { success: true, role: 'toda_admin' };
      }

      // Neither LGU nor TODA Admin
      await supabase.auth.signOut();
      const msg = 'Access Denied: Your account does not have Administrator privileges.';
      console.log(`[LGU AUTH] redirect decision: rejected (no profile)`);
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };

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
