'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseOauthCallbackParams } from '@core/auth/parse-oauth-callback';
import { getBrowserSupabase } from '@core/api/supabase.browser';

export default function AuthCallback() {
  const router = useRouter();
  const didRun = useRef(false);
  const [debugSearch, setDebugSearch] = useState<string>('');

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    setDebugSearch(window.location.search);

    const run = async () => {
      const supabase = getBrowserSupabase();
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

      if (tokenHash && type) {
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
        const waitForSession = async () => {
          for (let attempt = 0; attempt < 10; attempt += 1) {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session) return session;
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
          return null;
        };

        // With detectSessionInUrl enabled, the client may exchange PKCE automatically.
        // Wait briefly to avoid a second exchange that can fail with empty code_verifier.
        const detectedSession = await waitForSession();
        if (!detectedSession) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            const {
              data: { session: postErrorSession },
            } = await supabase.auth.getSession();
            if (!postErrorSession) {
              const rawMessage = exchangeError.message || 'Error procesando autenticacion';
              const lowerMessage = rawMessage.toLowerCase();
              if (
                lowerMessage.includes('pkce code verifier not found') ||
                lowerMessage.includes('both auth code and code verifier should be non-empty')
              ) {
                router.replace(
                  '/login?message=El enlace fue abierto en otro navegador, ya se uso o expiro. Intenta iniciar sesion de nuevo.'
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

      router.replace(next || '/');
    };

    void run();
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-700 mx-auto mb-4" />
        <p className="text-gray-700">Procesando autenticación…</p>

        {process.env.NODE_ENV === 'development' && (
          <p className="mt-3 text-xs text-gray-500">{debugSearch}</p>
        )}
      </div>
    </div>
  );
}
