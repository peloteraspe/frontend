'use client';

import Image from 'next/image';
import { FormEvent, useId, useMemo, useState } from 'react';
import Logo from '@core/assets/Logo-text.svg';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type ApiResponse = { message?: string };

export default function ComingSoonLanding() {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const successId = useId();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canSubmit = useMemo(
    () => !loading && normalizedEmail.length > 0,
    [loading, normalizedEmail]
  );

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!isValidEmail(normalizedEmail)) {
      setError('Ingresa un correo válido (ej: hola@correo.com).');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        setError(data?.message || 'No se pudo guardar tu correo. Intenta de nuevo.');
        return;
      }

      setSuccess(data?.message || '¡Listo! Te avisaremos cuando abramos el acceso.');
      setEmail('');
    } catch {
      setError('No se pudo guardar tu correo. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative w-full min-h-[calc(100vh-180px)] overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(84,8,111,0.22),transparent_42%),radial-gradient(circle_at_82%_18%,rgba(248,113,113,0.14),transparent_36%),radial-gradient(circle_at_50%_90%,rgba(34,197,94,0.10),transparent_40%)]" />
      <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full border border-white/50 bg-white/40 blur-2xl" />
      <div className="pointer-events-none absolute right-0 top-8 h-72 w-72 rounded-full border border-white/40 bg-white/30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.65),rgba(255,255,255,0.92))]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 md:px-8 md:py-16">
        <Image src={Logo} alt="Peloteras logo" className="mx-auto h-10 w-auto" />

        {/* Hero */}
        <header className="mx-auto max-w-4xl text-center">
          <h1 className="font-eastman-extrabold text-5xl leading-[0.95] text-slate-900 sm:text-6xl md:text-7xl">
            El deporte femenino
            <span className="block text-[#54086F]">se organiza mejor aquí</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-700 sm:text-lg">
            Estamos preparando el acceso a la demo para que encontrar partidos, armar equipo y jugar
            sea simple. Súmate a la lista y entra primero.
          </p>
        </header>

        <div className="mx-auto grid w-full max-w-5xl gap-6">
          {/* Form card */}
          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_30px_80px_-40px_rgba(84,8,111,0.55)] backdrop-blur-sm md:p-8">
            <h2 className="font-eastman-bold text-2xl text-slate-900 md:text-3xl">
              Lista de espera
            </h2>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Te avisamos cuando abramos acceso y te compartimos novedades del lanzamiento.
            </p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 md:flex-row" noValidate>
              <div className="flex-1">
                <label htmlFor={inputId} className="sr-only">
                  Correo electrónico
                </label>

                <input
                  id={inputId}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  inputMode="email"
                  aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}${success ? ` ${successId}` : ''}`}
                  aria-invalid={Boolean(error)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#54086F] focus:outline-none focus:ring-2 focus:ring-[#54086F]/20"
                  required
                />

                <p id={hintId} className="mt-2 text-xs text-slate-500">
                  Sin spam. Solo avisos de acceso y novedades.
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="h-12 rounded-xl bg-[#54086F] px-6 font-semibold text-white transition hover:bg-[#6d118f] disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {loading && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"
                    aria-hidden="true"
                  />
                )}
                {loading ? 'Guardando…' : 'Unirme'}
              </button>
            </form>

            {/* Messages */}
            <div className="mt-3 space-y-2">
              {error && (
                <p
                  id={errorId}
                  role="alert"
                  aria-live="assertive"
                  className="text-sm text-red-600"
                >
                  {error}
                </p>
              )}

              {success && (
                <div
                  id={successId}
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
                >
                  <p className="font-semibold">✅ {success}</p>
                  <p className="mt-1 text-emerald-800/90">
                    ¿Quieres ayudarnos a llegar a más peloteras? Compártelo en tus stories 💜⚽
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
