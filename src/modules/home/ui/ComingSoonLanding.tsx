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
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canSubmit = useMemo(
    () => !loading && normalizedEmail.length > 0,
    [loading, normalizedEmail]
  );
  const shareText = 'Me uní a Peloteras para jugar más seguido. Súmate aquí:';
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://peloteras.com';
    const base = window.location.origin;
    return `${base}/?utm_source=share&utm_medium=social&utm_campaign=coming_soon`;
  }, []);
  const encodedShareText = encodeURIComponent(`${shareText} ${shareUrl}`);
  const valuePoints = [
    {
      title: 'Encuentra partidos en minutos',
      description: 'Publicamos fechas, horarios, sede y nivel para que sepas rápido dónde jugar.',
    },
    {
      title: 'Arma equipo sin chats infinitos',
      description:
        'Confirma asistencia, completa cupos y organiza a tu equipo desde un solo lugar.',
    },
    {
      title: 'Juega con más seguridad',
      description:
        'Toda la información del evento queda clara antes de salir de casa: costo, reglas y ubicación.',
    },
  ];

  const howItWorks = [
    'Explora partidos por fecha, zona y nivel.',
    'Únete al evento y confirma tu asistencia.',
    'Recibe recordatorios y llega lista para jugar.',
  ];

  const handleNativeShare = async () => {
    setShareMessage(null);
    try {
      if (!navigator.share) {
        setShareMessage('Tu navegador no permite compartir directo. Usa copiar enlace.');
        return;
      }

      await navigator.share({
        title: 'Peloteras',
        text: shareText,
        url: shareUrl,
      });
    } catch {
      setShareMessage('No se pudo abrir compartir. Puedes copiar el enlace.');
    }
  };

  const handleCopyLink = async () => {
    setShareMessage(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage('Enlace copiado.');
    } catch {
      setShareMessage('No se pudo copiar. Comparte manualmente: ' + shareUrl);
    }
  };

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

      setSuccess(data?.message || '¡Listo! Te avisaremos apenas lancemos Peloteras.');
      setEmail('');
    } catch {
      setError('No se pudo guardar tu correo. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) {
      const candidate = value.trim().toLowerCase();
      if (candidate.length === 0 || isValidEmail(candidate)) {
        setError(null);
      }
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

        <header className="mx-auto max-w-5xl text-center">
          <p className="font-eastman-bold text-sm uppercase tracking-[0.2em] text-[#54086F]">
            Juega, organiza y conecta con más mujeres y personas de la diversidad a través del
            fútbol.
          </p>
          <h1 className="mt-3 font-eastman-extrabold text-5xl leading-[0.95] text-slate-900 sm:text-6xl md:text-7xl">
            Organiza tus partidos
            <span className="block text-[#54086F]">sin perder tiempo</span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base text-slate-700 sm:text-lg">
            Peloteras es una plataforma para encontrar partidos de fútbol femenino, unirte fácil y
            coordinar tu equipo con información clara antes de jugar.
          </p>
        </header>

        <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_30px_80px_-40px_rgba(84,8,111,0.55)] backdrop-blur-sm md:p-8">
            <h2 className="font-eastman-bold text-2xl text-slate-900 md:text-3xl">
              Qué podrás hacer en Peloteras
            </h2>
            <ul className="mt-5 space-y-4">
              {valuePoints.map((point) => (
                <li key={point.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900 md:text-base">{point.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{point.description}</p>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Cómo funciona</p>
              <ol className="mt-3 space-y-2">
                {howItWorks.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-slate-700">
                    <span className="font-eastman-bold text-[#54086F]">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_30px_80px_-40px_rgba(84,8,111,0.55)] backdrop-blur-sm md:p-8">
            <h2 className="font-eastman-bold text-2xl text-slate-900 md:text-3xl">
              Aviso de lanzamiento
            </h2>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Déjanos tu correo y te avisamos cuando Peloteras esté disponible.
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
                  onChange={(event) => handleEmailChange(event.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  inputMode="email"
                  aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}${success ? ` ${successId}` : ''}`}
                  aria-invalid={Boolean(error)}
                  className={[
                    'peloteras-form-control h-12',
                    error ? 'peloteras-form-control--error' : '',
                  ].join(' ')}
                  required
                />

                <p id={hintId} className="mt-2 text-xs text-slate-500">
                  Sin spam. Solo te escribiremos cuando lancemos Peloteras y para novedades
                  importantes.
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
                {loading ? 'Guardando…' : 'Quiero que me avisen'}
              </button>
            </form>

            {/* Messages */}
            <div className="mt-3 space-y-2">
              {error && (
                <p id={errorId} role="alert" aria-live="assertive" className="text-sm text-red-600">
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
                  <p className="font-semibold">{success}</p>
                  <p className="mt-1 text-emerald-800/90">
                    ¿Conoces más jugadoras? Comparte Peloteras con tu equipo.
                  </p>
                </div>
              )}
            </div>

            {success && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Comparte Peloteras</p>
                <p className="mt-1 text-xs text-slate-600">Invita a más jugadoras desde aquí.</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
                  >
                    Compartir
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
                  >
                    Copiar enlace
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodedShareText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-100 inline-flex items-center"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodedShareText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-100 inline-flex items-center"
                  >
                    X
                  </a>
                </div>

                {shareMessage && <p className="mt-2 text-xs text-slate-600">{shareMessage}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
