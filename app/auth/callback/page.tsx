'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseOauthCallbackParams } from '@core/auth/parse-oauth-callback';
import { getBrowserSupabase } from '@core/api/supabase.browser';

export default function AuthCallback() {
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const run = async () => {
      const supabase = getBrowserSupabase();
      const currentUrl = new URL(window.location.href);
      const searchParams = currentUrl.searchParams;
      const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''));

      const readParam = (key: string) =>
        searchParams.get(key) || hashParams.get(key) || null;

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
          if (String(verifyError.message || '').toLowerCase().includes('expired')) {
            router.replace('/auth/forgot-password?message=link_expired');
          } else {
            router.replace(`/login?error=${msg}`);
          }
          return;
        }
      } else if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          const rawMessage = exchangeError.message || 'Error procesando autenticacion';
          const lowerMessage = rawMessage.toLowerCase();
          if (lowerMessage.includes('pkce code verifier not found')) {
            router.replace(
              '/login?message=El enlace fue abierto en otro navegador o expiro. Solicita uno nuevo desde el banner.'
            );
            return;
          }
          const msg = encodeURIComponent(rawMessage);
          router.replace(`/login?error=${msg}`);
          return;
        }
      }

      const { error, error_code, error_description, next } = parseOauthCallbackParams(
        window.location.href
      );

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
          <p className="mt-3 text-xs text-gray-500">{window.location.search}</p>
        )}
      </div>
    </div>
  );
}
