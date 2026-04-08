'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@core/api/supabase.browser';
import { normalizePhoneMetadata } from '@shared/lib/phone';

export default function VerifyEventsPage() {
  const router = useRouter();
  const didRun = useRef(false);
  const [message, setMessage] = useState('Validando tu identidad para eventos...');

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const run = async () => {
      const supabase = getBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage('Tu sesion no esta activa. Inicia sesion para continuar.');
        setTimeout(() => router.replace('/login'), 1300);
        return;
      }

      if (user.user_metadata?.events_verified) {
        setMessage('Tu cuenta ya estaba verificada. Redirigiendo...');
        setTimeout(() => router.replace('/'), 1000);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          ...normalizePhoneMetadata(user.user_metadata),
          events_verified: true,
        },
      });

      if (error) {
        setMessage('No pudimos validar tu identidad. Intenta de nuevo desde el banner superior.');
        return;
      }

      setMessage('Identidad verificada. Redirigiendo...');
      setTimeout(() => router.replace('/'), 900);
    };

    void run();
  }, [router]);

  return (
    <main className="w-full min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Verificacion de cuenta</h1>
        <p className="mt-3 text-slate-600">{message}</p>
      </div>
    </main>
  );
}
