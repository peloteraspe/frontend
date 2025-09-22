'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type UserLite = { id: string; email?: string | null; username?: string | null } | null;

type AuthCtx = {
  user: UserLite;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, loading: true, refreshProfile: async () => {} });

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<UserLite>(null);
  const [loading, setLoading] = useState(true);

  const loadUserAndProfile = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from('profile')
        .select('username')
        .eq('user', user.id)
        .maybeSingle();

      setUser({
        id: user.id,
        email: user.email,
        username: profile?.username ?? user.user_metadata?.username ?? null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserAndProfile();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadUserAndProfile();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, refreshProfile: loadUserAndProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
