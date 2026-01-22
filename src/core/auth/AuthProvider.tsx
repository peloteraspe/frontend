// AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@src/core/api/supabase.browser';

type UserLite = { id: string; email?: string | null; username?: string | null } | null;

type AuthCtx = {
  user: UserLite;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [user, setUser] = useState<UserLite>(null);
  const [loading, setLoading] = useState(true);

  const hydrateFromSession = async () => {
    console.log('🔄 AuthProvider: Starting session hydration...');
    setLoading(true);

    try {
      // First, get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log('📊 Session check:', {
        hasSession: !!session,
        error: sessionError?.message,
        accessToken: session?.access_token ? 'present' : 'missing',
        expiresAt: session?.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : 'no expiry',
      });

      // If no session, try to get user directly (checks localStorage)
      if (!session) {
        console.log('❌ No session found, checking localStorage for user...');
        const {
          data: { user: directUser },
          error: directUserError,
        } = await supabase.auth.getUser();

        if (directUser && !directUserError) {
          console.log('✅ User found in localStorage:', directUser.id);
          const userData = {
            id: directUser.id,
            email: directUser.email,
            username: directUser.user_metadata?.username ?? null,
          };
          setUser(userData);
          return;
        } else {
          console.log('❌ No user found anywhere');
          setUser(null);
          return;
        }
      }

      // We have a session, get the user
      const {
        data: { user: sessionUser },
        error: userError,
      } = await supabase.auth.getUser();

      console.log('👤 User from session:', {
        user: !!sessionUser,
        id: sessionUser?.id,
        email: sessionUser?.email,
        error: userError?.message,
      });

      if (!sessionUser || userError) {
        console.log('❌ Could not get user from session');
        setUser(null);
        return;
      }

      const userData = {
        id: sessionUser.id,
        email: sessionUser.email,
        username: sessionUser.user_metadata?.username ?? null,
      };

      setUser(userData);
      console.log('✅ User set successfully:', userData);

      // Try to get profile data
      try {
        const { data: profile } = await supabase
          .from('profile')
          .select('username')
          .eq('user', sessionUser.id)
          .maybeSingle();

        if (profile?.username) {
          setUser((prev) => (prev ? { ...prev, username: profile.username } : prev));
          console.log('✅ Profile loaded:', profile.username);
        }
      } catch (profileErr) {
        console.warn('⚠️ Profile fetch failed:', profileErr);
      }
    } catch (err) {
      console.error('❌ Session hydration error:', err);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('🔄 Session hydration complete');
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider: Initializing...');

    // Initial session check
    hydrateFromSession();

    // Listen to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state change:', { event, hasSession: !!session });

      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('📤 User signed out');
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const u = session.user;
        const userData = {
          id: u.id,
          email: u.email,
          username: u.user_metadata?.username ?? null,
        };

        setUser(userData);
        setLoading(false);
        console.log('✅ User updated from auth event:', userData);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const refreshProfile = async () => {
    await hydrateFromSession();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  return <Ctx.Provider value={{ user, loading, refreshProfile, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
