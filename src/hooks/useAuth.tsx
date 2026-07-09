import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, User } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (fullName: string, username: string, password: string, supportingCountry: string) => Promise<{ error?: string }>;
  signIn: (username: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Fallback timeout - ensure we don't hang forever
    const fallbackTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Auth fallback timeout reached');
        setLoading(false);
      }
    }, 3000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);

        if (session?.user) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!error && data && mounted) {
            setUser(data);
          }
        }

        clearTimeout(fallbackTimeout);
        setLoading(false);
      } catch (e) {
        console.error('Auth init error:', e);
        clearTimeout(fallbackTimeout);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);

      if (session?.user) {
        (async () => {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!error && data && mounted) {
            setUser(data);
          }
        })();
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (fullName: string, username: string, password: string, supportingCountry: string) => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedFullName = fullName.trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        password,
        email: `${normalizedUsername}@wc2026.local`,
        options: {
          data: {
            full_name: normalizedFullName,
            username: normalizedUsername,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      const sessionResponse = await supabase.auth.getSession();
      if (!sessionResponse.data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: `${normalizedUsername}@wc2026.local`,
          password,
        });

        if (signInError) {
          return { error: signInError.message };
        }
      }

      const userId = data.user?.id ?? sessionResponse.data.session?.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from('users').insert({
          id: userId,
          full_name: normalizedFullName,
          username: normalizedUsername,
          supporting_country: supportingCountry,
        });

        if (profileError) {
          return { error: profileError.message };
        }
      }

      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'An unexpected error occurred' };
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${username.toLowerCase()}@wc2026.local`,
        password,
      });

      if (error) {
        return { error: 'Invalid username or password' };
      }

      return {};
    } catch (e) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
