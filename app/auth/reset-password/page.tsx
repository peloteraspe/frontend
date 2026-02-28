'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Input from '@core/ui/Input';
import { getBrowserSupabase } from '@core/api/supabase.browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        if (
          (updateError.message || '').toLowerCase().includes('expired') ||
          (updateError.message || '').toLowerCase().includes('session')
        ) {
          setError('El enlace expiro. Solicita uno nuevo para continuar.');
          return;
        }
        setError(updateError.message || 'No se pudo actualizar la contraseña.');
        return;
      }

      router.replace('/login?message=Contraseña actualizada con exito');
    } catch {
      setError('No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pt-8 pb-12 md:pt-12">
      <div className="text-center mb-8">
        <p className="inline-block px-3 py-1 rounded-full bg-mulberry/10 text-mulberry text-xs font-semibold tracking-wide uppercase">
          Seguridad
        </p>
        <h1 className="mt-4 font-eastman-extrabold text-4xl md:text-5xl leading-tight text-slate-900">
          Configura tu <span className="text-mulberry">nueva contraseña</span>
        </h1>
        <p className="mt-3 text-slate-600 text-base">
          Usa una contraseña facil de recordar para ti y dificil de adivinar.
        </p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-3xl p-5 md:p-7 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Nueva contraseña"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Minimo 6 caracteres"
          />

          <Input
            label="Confirmar contraseña"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
          />

          {error && (
            <p className="text-sm text-red-600" aria-live="polite">
              {error}
            </p>
          )}
          {error?.toLowerCase().includes('expiro') && (
            <Link
              href="/auth/forgot-password"
              className="text-sm text-mulberry font-semibold hover:text-mulberry/80"
            >
              Solicitar nuevo enlace
            </Link>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
