'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import Input from '@core/ui/Input';
import { getBrowserSupabase } from '@core/api/supabase.browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpiredLink, setIsExpiredLink] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsExpiredLink(params.get('message') === 'link_expired');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Ingresa un correo valido.');
      return;
    }

    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/recovery?next=${encodeURIComponent('/auth/reset-password')}`,
      });

      if (resetError) {
        setError(resetError.message || 'No se pudo enviar el enlace.');
        return;
      }

      toast.success('Te enviamos un enlace para cambiar tu contraseña.');
    } catch {
      setError('No se pudo enviar el enlace. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pt-8 pb-12 md:pt-12">
      <div className="text-center mb-8">
        <h1 className="mt-4 font-eastman-extrabold text-4xl md:text-5xl leading-tight text-slate-900">
          Recupera tu <span className="text-mulberry">contraseña</span>
        </h1>
        <p className="mt-3 text-slate-600 text-base">
          Te enviaremos un enlace seguro para restablecerla.
        </p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-3xl p-5 md:p-7 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        {isExpiredLink && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Tu enlace anterior expiro o ya fue usado. Te enviamos uno nuevo desde aqui.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Correo electrónico"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="pelotera@gmail.com"
            errorText={error || undefined}
          />

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-5">
          Recordaste tu contraseña?{' '}
          <Link href="/login" className="font-semibold text-mulberry hover:text-mulberry/80">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
