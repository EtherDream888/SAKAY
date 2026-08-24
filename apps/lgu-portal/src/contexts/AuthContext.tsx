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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return { success: false, error: signInError.message };
      }

      if (!data.user) {
        const msg = 'Login failed: No user returned from authentication service.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      // Fetch LGU Admin profile record
      const profile = await fetchAdminProfile(data.user);

      if (!profile) {
        // User exists in auth.users, but is not in public.lgu_admin
        await supabase.auth.signOut();
        const msg = 'Access Denied: Your account does not have LGU Administrator privileges.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
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

      return { success: true };
    } catch (err: any) {
      console.error('Sign in exception:', err);
      const msg = err.message || 'An unexpected error occurred during login.';
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
