// AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

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
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<UserLite>(null);
  const [loading, setLoading] = useState(true);

  const hydrateFromSession = async () => {
    setLoading(true);
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();

      if (!u) {
        setUser(null);
        return;
      }

      setUser({
        id: u.id,
        email: u.email,
        username: u.user_metadata?.username ?? null,
      });

      const { data: profile } = await supabase
        .from('profile')
        .select('username')
        .eq('user', u.id)
        .maybeSingle();

      if (profile?.username) {
        setUser((prev) => (prev ? { ...prev, username: profile.username } : prev));
      }
    } catch (err) {
      console.error('hydrateFromSession error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrateFromSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user;

      if (!u) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser({
        id: u.id,
        email: u.email,
        username: u.user_metadata?.username ?? null,
      });
      setLoading(false);

      try {
        const { data: profile } = await supabase
          .from('profile')
          .select('username')
          .eq('user', u.id)
          .maybeSingle();

        if (profile?.username) {
          setUser((prev) => (prev ? { ...prev, username: profile.username } : prev));
        }
      } catch (err) {
        console.error('onAuthStateChange profile refine error:', err);
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
