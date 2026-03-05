'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { parseOauthCallbackParams } from '@core/auth/parse-oauth-callback';
import { getBrowserSupabase } from '@core/api/supabase.browser';
import soccerBall from '@core/assets/soccer-ball.svg';

export default function AuthCallback() {
  const didRun = useRef(false);
  const hasNavigated = useRef(false);
  const [debugSearch, setDebugSearch] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState('Verificando tu cuenta…');

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    setDebugSearch(window.location.search);

    const supabase = getBrowserSupabase();
    const withTimeout = async <T,>(
      promise: PromiseLike<T>,
      timeoutMs: number,
      timeoutError: Error
    ) =>
      Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
          const timer = window.setTimeout(() => {
            window.clearTimeout(timer);
            reject(timeoutError);
          }, timeoutMs);
        }),
      ]);

    const navigate = (target: string) => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;

      const safeTarget =
        typeof target === 'string' &&
        target.startsWith('/') &&
        !target.startsWith('//') &&
        !target.startsWith('/auth/callback')
          ? target
          : '/';

      window.location.replace(safeTarget);
    };

    const resolveDestinationFromCurrentAuth = async () => {
      let currentUser: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null = null;

      try {
        const userResult = (await withTimeout(
          supabase.auth.getUser(),
          4000,
          new Error('Current user lookup timeout')
        )) as Awaited<ReturnType<typeof supabase.auth.getUser>>;
        currentUser = userResult.data.user;
      } catch {
        return '/';
      }

      if (!currentUser) {
        return '/login';
      }

      const isEmailConfirmed = Boolean(currentUser.email_confirmed_at);
      const emailParam = currentUser.email ? `&email=${encodeURIComponent(currentUser.email)}` : '';

      try {
        const profileResult = (await withTimeout(
          supabase
            .from('profile')
            .select('username, level_id, onboarding_step, is_profile_complete')
            .eq('user', currentUser.id)
            .order('is_profile_complete', { ascending: false })
            .order('onboarding_step', { ascending: false })
            .order('id', { ascending: false })
            .limit(1),
          7000,
          new Error('Profile lookup timeout')
        )) as {
          data: Array<{
            username?: string | null;
            level_id?: number | null;
            onboarding_step?: number | null;
            is_profile_complete?: boolean | null;
          }> | null;
        };
        const profileRows = profileResult.data;
        const profile = Array.isArray(profileRows) ? profileRows[0] : null;

        const completedStep =
          typeof profile?.onboarding_step === 'number' ? profile.onboarding_step : 0;
        const isProfileComplete = profile?.is_profile_complete === true;

        if (isProfileComplete) {
          return isEmailConfirmed ? '/' : `/signUp?step=3${emailParam}`;
        }

        if (completedStep >= 2) {
          return !isEmailConfirmed ? `/signUp?step=3${emailParam}` : '/signUp?step=2';
        }

        return '/signUp?step=2';
      } catch {
        // If profile lookup fails but session exists, never block user in callback.
        return isEmailConfirmed ? '/' : `/signUp?step=3${emailParam}`;
      }
    };

    const waitForUsableAuth = async (attempts = 20, delayMs = 250) => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const {
            data: { session },
          } = await withTimeout(supabase.auth.getSession(), 3000, new Error('Session lookup timeout'));
          if (session) return true;

          const {
            data: { user },
          } = await withTimeout(supabase.auth.getUser(), 3000, new Error('User lookup timeout'));
          if (user) return true;
        } catch {
          // Continue retrying while auth settles.
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      return false;
    };

    const run = async () => {

      const currentUrl = new URL(window.location.href);
      const searchParams = currentUrl.searchParams;
      const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''));
      const { error, error_code, error_description, next } = parseOauthCallbackParams(
        window.location.href
      );

      const readParam = (key: string) => searchParams.get(key) || hashParams.get(key) || null;

      const code = readParam('code');
      const tokenHash = readParam('token_hash');
      const type = readParam('type');
      const email = readParam('email');

      if (tokenHash && type) {
        setStatusMessage('Confirmando tu correo…');
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (verifyError) {
          const msg = encodeURIComponent(verifyError.message || 'Error verificando enlace');
          if (
            String(verifyError.message || '')
              .toLowerCase()
              .includes('expired')
          ) {
            navigate('/auth/forgot-password?message=link_expired');
          } else {
            navigate(`/login?error=${msg}`);
          }
          return;
        }
      } else if (code) {
        setStatusMessage('Validando tu acceso…');
        // With detectSessionInUrl enabled, the client may exchange PKCE automatically.
        // Wait briefly to avoid a second exchange that can fail with empty code_verifier.
        const detectedSession = await waitForUsableAuth(10, 200);
        if (!detectedSession) {
          let exchangeError: Error | null = null;
          try {
            const exchangeResult = await withTimeout(
              supabase.auth.exchangeCodeForSession(code),
              9000,
              new Error('OAuth exchange timeout')
            );
            exchangeError = exchangeResult.error as any;
          } catch (exchangeTimeoutError: any) {
            exchangeError = exchangeTimeoutError;
          }
          if (exchangeError) {
            const hasLateSession = await waitForUsableAuth(12, 250);
            if (!hasLateSession) {
              const rawMessage = exchangeError.message || 'Error procesando autenticacion';
              const lowerMessage = rawMessage.toLowerCase();
              if (
                lowerMessage.includes('pkce code verifier not found') ||
                lowerMessage.includes('both auth code and code verifier should be non-empty')
              ) {
                if (email) {
                  try {
                    const response = await fetch('/api/onboarding/by-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    });

                    if (response.ok) {
                      const onboarding = (await response.json()) as { emailConfirmed?: boolean };
                      if (onboarding.emailConfirmed) {
                        setStatusMessage('Cuenta verificada. Iniciando sesion…');
                        navigate(
                          '/login?message=Tu correo ya fue verificado. Inicia sesion para continuar.'
                        );
                        return;
                      }
                    }
                  } catch {
                    // Fall through to generic PKCE message below.
                  }
                }

                navigate(
                  '/login?message=No pudimos abrir tu sesion automaticamente despues de verificar el correo. Inicia sesion para continuar.'
                );
                return;
              }
              const msg = encodeURIComponent(rawMessage);
              navigate(`/login?error=${msg}`);
              return;
            }
          }
        }
      }

      if (error) {
        if (error_code === 'otp_expired') {
          if ((next || '').startsWith('/auth/reset-password')) {
            navigate('/auth/forgot-password?message=link_expired');
          } else {
            navigate('/login?message=link_expired');
          }
          return;
        }
        const msg = encodeURIComponent(error_description || error);
        navigate(`/login?error=${msg}`);
        return;
      }

      setStatusMessage('Cuenta verificada. Iniciando sesion…');
      const hasUsableAuth = await waitForUsableAuth(20, 200);
      if (!hasUsableAuth) {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!currentUser) {
          navigate('/login?error=No%20pudimos%20iniciar%20tu%20sesion%20automaticamente');
          return;
        }
      }

      const destination = await resolveDestinationFromCurrentAuth();

      const nextDestination =
        typeof next === 'string' &&
        next.startsWith('/') &&
        !next.startsWith('//') &&
        !next.startsWith('/auth/callback')
          ? next
          : null;
      navigate(nextDestination || destination);
    };

    let timeoutId: number | null = null;
    const CALLBACK_MAX_WAIT_MS = 18000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('Auth callback timeout')), CALLBACK_MAX_WAIT_MS);
    });

    void Promise.race([run(), timeoutPromise]).catch(async () => {
      try {
        const fallbackDestination = await resolveDestinationFromCurrentAuth();
        navigate(fallbackDestination);
      } catch {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (currentUser) {
          navigate('/');
          return;
        }
        navigate('/login?error=No%20pudimos%20validar%20tu%20acceso');
      }
    });

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="text-center flex flex-col items-center">
        <div className="mb-5 animate-spin">
          <Image src={soccerBall} alt="Cargando" width={56} height={56} priority />
        </div>
        <p className="text-slate-900 font-semibold">Un momento…</p>
        <p className="mt-2 text-sm text-slate-600">{statusMessage}</p>

        {process.env.NODE_ENV === 'development' && (
          <p className="mt-3 text-xs text-gray-500">{debugSearch}</p>
        )}
      </div>
    </div>
  );
}
