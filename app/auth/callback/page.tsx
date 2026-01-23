'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseOauthCallbackParams } from '@core/auth/parse-oauth-callback';

export default function AuthCallback() {
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const { error, error_description, next } = parseOauthCallbackParams(window.location.href);

    if (error) {
      const msg = encodeURIComponent(error_description || error);
      router.replace(`/login?error=${msg}`);
      return;
    }

    router.replace(next || '/');
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
