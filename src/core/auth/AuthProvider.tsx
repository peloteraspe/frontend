// AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@core/api/supabase.browser';

type UserLite = {
  id: string;
  email?: string | null;
  username?: string | null;
  email_confirmed_at?: string | null;
  emailConfirmed?: boolean;
  eventsVerified?: boolean;
} | null;

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

function isEventsVerified(value: unknown) {
  return value === true || value === 'true';
}

function normalizeAuthErrorMessage(raw: string) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function shouldClearSessionForError(rawMessage: string) {
  const message = normalizeAuthErrorMessage(rawMessage);
  return (
    message.includes('user from sub claim in jwt does not exist') ||
    message.includes('user not found') ||
    message.includes('usuario no encontrado') ||
    message.includes('jwt expired') ||
    message.includes('invalid jwt') ||
    message.includes('session not found') ||
    message.includes('refresh token not found')
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? '');
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [user, setUser] = useState<UserLite>(null);
  const [loading, setLoading] = useState(true);

  const mapAuthUserToLite = (authUser: {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    user_metadata?: Record<string, any>;
  }) => ({
    id: authUser.id,
    email: authUser.email,
    username: authUser.user_metadata?.username ?? null,
    email_confirmed_at: authUser.email_confirmed_at ?? null,
    emailConfirmed: Boolean(authUser.email_confirmed_at),
    eventsVerified: isEventsVerified(authUser.user_metadata?.events_verified),
  });

  const clearInvalidLocalSession = async (reason: string) => {
    console.warn('⚠️ Clearing invalid local session:', reason);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.warn('⚠️ Local sign-out failed while clearing invalid session:', signOutError);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const loadProfileUsername = async (userId: string) => {
    try {
      const { data: rows, error } = await supabase
        .from('profile')
        .select('id, username')
        .eq('user', userId)
        .order('id', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('⚠️ Profile username query returned error:', error.message);
        return null;
      }

      return rows?.[0]?.username ?? null;
    } catch (profileErr) {
      console.warn('⚠️ Profile username fetch failed:', profileErr);
      return null;
    }
  };

  const hydrateUsernameFromProfile = (userId: string) => {
    void loadProfileUsername(userId).then((profileUsername) => {
      if (profileUsername) {
        setUser((prev) => (prev ? { ...prev, username: profileUsername } : prev));
      }
    });
  };

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
          const userData = mapAuthUserToLite(directUser);
          setUser(userData);
          hydrateUsernameFromProfile(directUser.id);
          return;
        } else {
          if (directUserError) {
            if (shouldClearSessionForError(directUserError.message || '')) {
              await clearInvalidLocalSession(
                `direct user lookup failed: ${directUserError.message || 'unknown error'}`
              );
            } else {
              console.warn('⚠️ Direct user lookup failed with non-fatal error:', directUserError);
              setUser(null);
              setLoading(false);
            }
            return;
          }
          console.log('❌ No user found anywhere');
          setUser(null);
          return;
        }
      }

      let sessionUser = session.user;
      let userErrorMessage: string | undefined;

      // `getSession` already carries the user; only hit `getUser` if session.user is missing.
      if (!sessionUser) {
        const {
          data: { user: fetchedUser },
          error: userError,
        } = await supabase.auth.getUser();
        sessionUser = fetchedUser;
        userErrorMessage = userError?.message;
      }

      console.log('👤 User from session:', {
        user: !!sessionUser,
        id: sessionUser?.id,
        email: sessionUser?.email,
        error: userErrorMessage,
      });

      if (!sessionUser) {
        console.log('❌ Could not get user from session');
        if (shouldClearSessionForError(userErrorMessage || '')) {
          await clearInvalidLocalSession(
            `session user lookup failed: ${userErrorMessage || 'missing user'}`
          );
        } else {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const userData = mapAuthUserToLite(sessionUser);

      setUser(userData);
      console.log('✅ User set successfully:', userData);
      hydrateUsernameFromProfile(sessionUser.id);
    } catch (err) {
      console.error('❌ Session hydration error:', err);
      const message = errorMessage(err);
      if (shouldClearSessionForError(message)) {
        await clearInvalidLocalSession(`session hydration failed: ${message || 'unknown error'}`);
      } else {
        // Keep current user state for transient failures (timeouts/network blips).
        console.warn('⚠️ Preserving auth state after transient hydration error:', message);
      }
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

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION' ||
        event === 'USER_UPDATED'
      ) {
        const u = session.user;
        const userData = mapAuthUserToLite(u);

        setUser(userData);
        setLoading(false);
        console.log('✅ User updated from auth event:', userData);
        hydrateUsernameFromProfile(u.id);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const refreshProfile = async () => {
    await hydrateFromSession();
  };

  const clearSupabaseAuthStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      const localKeysToRemove = Object.keys(window.localStorage).filter(
        (key) => key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')
      );
      for (const key of localKeysToRemove) {
        window.localStorage.removeItem(key);
      }

      const sessionKeysToRemove = Object.keys(window.sessionStorage).filter(
        (key) => key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')
      );
      for (const key of sessionKeysToRemove) {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('⚠️ Could not clear local Supabase storage:', error);
    }

    try {
      const cookiePairs = document.cookie.split(';');
      for (const pair of cookiePairs) {
        const rawName = pair.split('=')[0]?.trim();
        if (!rawName) continue;
        if (
          !rawName.includes('sb-') &&
          !rawName.includes('supabase-auth-token') &&
          !rawName.includes('supabase') &&
          !rawName.includes('auth-token')
        ) {
          continue;
        }

        document.cookie = `${rawName}=; Path=/; Max-Age=0; SameSite=Lax`;
        document.cookie = `${rawName}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
      }

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const projectRef = (() => {
        try {
          return new URL(url).hostname.split('.')[0] || '';
        } catch {
          return '';
        }
      })();
      const baseNames = ['supabase-auth-token'];
      if (projectRef) {
        baseNames.push(`sb-${projectRef}-auth-token`);
        baseNames.push(`sb-${projectRef}-auth-token-code-verifier`);
      }
      const candidateNames = new Set<string>();
      for (const baseName of baseNames) {
        candidateNames.add(baseName);
        candidateNames.add(`__Secure-${baseName}`);
        candidateNames.add(`__Host-${baseName}`);
        for (let i = 0; i < 6; i += 1) {
          candidateNames.add(`${baseName}.${i}`);
          candidateNames.add(`__Secure-${baseName}.${i}`);
          candidateNames.add(`__Host-${baseName}.${i}`);
        }
      }

      const host = window.location.hostname;
      for (const name of Array.from(candidateNames)) {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Domain=${host}`;
          document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure; Domain=${host}`;
          document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Domain=.${host}`;
          document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure; Domain=.${host}`;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not clear Supabase auth cookies on client:', error);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('⚠️ Local sign-out failed:', error);
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('⚠️ Global sign-out failed:', error);
    }

    try {
      await fetch('/auth/signout', {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        cache: 'no-store',
      });
    } catch (error) {
      console.warn('⚠️ Server sign-out request failed:', error);
    } finally {
      clearSupabaseAuthStorage();
      setUser(null);
      setLoading(false);
    }
  };

  return <Ctx.Provider value={{ user, loading, refreshProfile, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
