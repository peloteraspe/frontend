'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseOauthCallbackParams } from '@core/auth/parse-oauth-callback';
import { getBrowserSupabase } from '@core/api/supabase.browser';
import { getCurrentOnboardingDestination } from '@modules/auth/lib/onboarding.client';
import soccerBall from '@core/assets/soccer-ball.svg';

export default function AuthCallback() {
  const router = useRouter();
  const didRun = useRef(false);
  const [debugSearch, setDebugSearch] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState('Verificando tu cuenta…');

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    setDebugSearch(window.location.search);

    const run = async () => {
      const supabase = getBrowserSupabase();
      const waitForUsableAuth = async (attempts = 20, delayMs = 250) => {
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) return true;

          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) return true;

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        return false;
      };

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
            router.replace('/auth/forgot-password?message=link_expired');
          } else {
            router.replace(`/login?error=${msg}`);
          }
          return;
        }
      } else if (code) {
        setStatusMessage('Validando tu acceso…');
        // With detectSessionInUrl enabled, the client may exchange PKCE automatically.
        // Wait briefly to avoid a second exchange that can fail with empty code_verifier.
        const detectedSession = await waitForUsableAuth(10, 200);
        if (!detectedSession) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
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
                        router.replace(
                          '/login?message=Tu correo ya fue verificado. Inicia sesion para continuar.'
                        );
                        return;
                      }
                    }
                  } catch {
                    // Fall through to generic PKCE message below.
                  }
                }

                router.replace(
                  '/login?message=No pudimos abrir tu sesion automaticamente despues de verificar el correo. Inicia sesion para continuar.'
                );
                return;
              }
              const msg = encodeURIComponent(rawMessage);
              router.replace(`/login?error=${msg}`);
              return;
            }
          }
        }
      }

      if (error) {
        if (error_code === 'otp_expired') {
          if ((next || '').startsWith('/auth/reset-password')) {
            router.replace('/auth/forgot-password?message=link_expired');
          } else {
            router.replace('/login?message=link_expired');
          }
          return;
        }
        const msg = encodeURIComponent(error_description || error);
        router.replace(`/login?error=${msg}`);
        return;
      }

      setStatusMessage('Cuenta verificada. Iniciando sesion…');
      const onboardingDestination = await getCurrentOnboardingDestination(supabase);
      router.replace(next || onboardingDestination);
    };

    void run();
  }, [router]);

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
