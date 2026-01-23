'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
    // aquí luego puedes enviar a Sentry
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6">
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold text-stone-900">Algo salió mal 😥</h2>

        {isDev && <p className="mt-2 text-gray-600 break-all text-sm">{error?.message}</p>}

        <button
          onClick={() => reset()}
          className="mt-6 inline-block text-white bg-primary px-4 py-2 rounded-md"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
