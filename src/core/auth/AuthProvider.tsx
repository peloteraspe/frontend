// AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { normalizePhoneMetadata } from '@shared/lib/phone';

type UserLite = {
  id: string;
  email?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  email_confirmed_at?: string | null;
  emailConfirmed?: boolean;
  eventsVerified?: boolean;
  app_metadata?: Record<string, any> | null;
  user_metadata?: Record<string, any> | null;
} | null;

type AuthCtx = {
  user: UserLite;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

type BrowserSupabaseModule = typeof import('@core/api/supabase.browser');
type BrowserSupabaseClient = ReturnType<BrowserSupabaseModule['getBrowserSupabase']>;

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

type BrowserWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const AUTH_EAGER_PATHS = ['/admin', '/auth', '/create-event', '/login', '/payments', '/profile', '/signUp', '/tickets', '/versus'];

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

function resolveAvatarUrl(metadata: Record<string, any> | undefined) {
  if (!metadata) return null;
  const candidates = [
    metadata.avatar,
    metadata.avatar_url,
    metadata.picture,
    metadata.photoURL,
    metadata.profile_image_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserLite>(null);
  const [loading, setLoading] = useState(true);
  const supabasePromiseRef = useRef<Promise<BrowserSupabaseClient> | null>(null);
  const initializedRef = useRef(false);

  const getSupabaseClient = async () => {
    if (!supabasePromiseRef.current) {
      supabasePromiseRef.current = import('@core/api/supabase.browser').then((module) =>
        module.getBrowserSupabase()
      );
    }

    return supabasePromiseRef.current;
  };

  const mapAuthUserToLite = (authUser: {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  }) => {
    const userMetadata = normalizePhoneMetadata(authUser.user_metadata) as Record<string, any>;
    const appMetadata = normalizePhoneMetadata(authUser.app_metadata) as Record<string, any>;

    return {
      id: authUser.id,
      email: authUser.email,
      username: userMetadata.username ?? null,
      avatar_url: resolveAvatarUrl(userMetadata),
      email_confirmed_at: authUser.email_confirmed_at ?? null,
      emailConfirmed: Boolean(authUser.email_confirmed_at),
      eventsVerified: isEventsVerified(userMetadata.events_verified),
      app_metadata: Object.keys(appMetadata).length ? appMetadata : null,
      user_metadata: Object.keys(userMetadata).length ? userMetadata : null,
    };
  };

  const clearInvalidLocalSession = async (reason: string) => {
    const supabase = await getSupabaseClient();
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
    const supabase = await getSupabaseClient();

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
    const supabase = await getSupabaseClient();
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!session) {
        const {
          data: { user: directUser },
          error: directUserError,
        } = await supabase.auth.getUser();

        if (directUser && !directUserError) {
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

      if (!sessionUser) {
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
      hydrateUsernameFromProfile(sessionUser.id);
    } catch (err) {
      const message = errorMessage(err);
      if (shouldClearSessionForError(message)) {
        await clearInvalidLocalSession(`session hydration failed: ${message || 'unknown error'}`);
      } else {
        // Keep current user state for transient failures (timeouts/network blips).
        console.warn('⚠️ Preserving auth state after transient hydration error:', message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const browserWindow = window as BrowserWindow;
    const pathname = window.location.pathname;
    const shouldInitImmediately = AUTH_EAGER_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    let idleCallbackId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const initializeAuth = () => {
      if (cancelled || initializedRef.current) {
        return;
      }

      initializedRef.current = true;
      void (async () => {
        const supabase = await getSupabaseClient();

        if (cancelled) {
          return;
        }

        void hydrateFromSession();

        const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || !session?.user) {
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
            const currentUser = session.user;
            const userData = mapAuthUserToLite(currentUser);

            setUser(userData);
            setLoading(false);
            hydrateUsernameFromProfile(currentUser.id);
          }
        });

        unsubscribe = () => {
          sub.subscription.unsubscribe();
        };
      })();
    };

    const initializeSoon = () => {
      if (shouldInitImmediately) {
        initializeAuth();
        return;
      }

      if (typeof browserWindow.requestIdleCallback === 'function') {
        idleCallbackId = browserWindow.requestIdleCallback(initializeAuth, { timeout: 1200 });
        return;
      }

      timeoutId = setTimeout(initializeAuth, 220);
    };

    const initializeOnInteraction = () => {
      initializeAuth();
    };

    initializeSoon();

    window.addEventListener('pointerdown', initializeOnInteraction, { passive: true, once: true });
    window.addEventListener('keydown', initializeOnInteraction, { once: true });
    window.addEventListener('focus', initializeOnInteraction, { once: true });

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener('pointerdown', initializeOnInteraction);
      window.removeEventListener('keydown', initializeOnInteraction);
      window.removeEventListener('focus', initializeOnInteraction);

      if (idleCallbackId !== null && typeof browserWindow.cancelIdleCallback === 'function') {
        browserWindow.cancelIdleCallback(idleCallbackId);
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

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
    const supabase = await getSupabaseClient();

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
