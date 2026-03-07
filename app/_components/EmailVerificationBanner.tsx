'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@core/auth/AuthProvider';
import { getBrowserSupabase } from '@core/api/supabase.browser';
import { authCallbackUrl } from '@modules/auth/lib/redirect';

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user || user.email_confirmed_at) return null;

  const handleResend = async () => {
    if (!user.email) return;
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: authCallbackUrl(),
        },
      });

      if (error) {
        toast.error(error.message || 'No se pudo reenviar el correo.');
        return;
      }

      toast.success('Correo reenviado. Revisa bandeja, spam o promociones.');
    } catch {
      toast.error('No se pudo reenviar el correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full border-y border-amber-200 bg-amber-50/95 text-amber-900">
      <div className="mx-auto max-w-screen-xl px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm">
          Debes verificar tu cuenta por correo para habilitar todas las funciones.
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="h-9 px-4 rounded-lg bg-amber-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          {loading ? 'Enviando...' : 'Reenviar correo'}
        </button>
      </div>
    </div>
  );
}
