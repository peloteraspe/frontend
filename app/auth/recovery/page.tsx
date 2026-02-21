'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getBrowserSupabase } from '@core/api/supabase.browser';

type RecoveryState = {
  tokenHash: string;
  type: string;
  next: string;
};

export default function RecoveryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<RecoveryState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash') || '';
    const type = params.get('type') || 'recovery';
    const next = params.get('next') || '/auth/reset-password';

    if (!tokenHash) {
      setError('El enlace no es valido o ya fue usado. Solicita uno nuevo.');
      return;
    }

    setState({ tokenHash, type, next });
  }, []);

  const handleContinue = async () => {
    if (!state) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = getBrowserSupabase();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: state.tokenHash,
        type: state.type as any,
      });

      if (verifyError) {
        const msg = (verifyError.message || '').toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid')) {
          setError('El enlace expiro o ya fue utilizado. Solicita uno nuevo.');
        } else {
          setError(verifyError.message || 'No se pudo validar el enlace.');
        }
        return;
      }

      toast.success('Enlace validado. Ahora crea tu nueva contrasena.');
      router.replace(state.next);
    } catch {
      setError('No se pudo validar el enlace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pt-8 pb-12 md:pt-12">
      <div className="text-center mb-8">
        <h1 className="mt-4 font-eastman-extrabold text-3xl md:text-4xl leading-tight text-slate-900">
          Validar enlace de <span className="text-mulberry">recuperacion</span>
        </h1>
        <p className="mt-3 text-slate-600 text-base">
          Presiona continuar para abrir la pantalla de nueva contrasena.
        </p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-3xl p-5 md:p-7 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={loading || !state}
          className="h-11 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
        >
          {loading ? 'Validando...' : 'Continuar'}
        </button>

        <p className="text-sm text-slate-600 mt-4">
          Si falla nuevamente, solicita otro desde{' '}
          <Link href="/auth/forgot-password" className="font-semibold text-mulberry hover:text-mulberry/80">
            recuperar contrasena
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
