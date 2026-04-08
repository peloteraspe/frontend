'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getBrowserSupabase } from '@core/api/supabase.browser';
import { useAuth } from '@core/auth/AuthProvider';
import InternationalPhoneField from '@core/ui/InternationalPhoneField';
import { trackEvent } from '@shared/lib/analytics';
import { validateInternationalPhone } from '@shared/lib/phone';

type Props = {
  isOpen: boolean;
  source?: string;
  initialPhone?: string;
  onClose: () => void;
  onActivated: () => void | Promise<void>;
};

export default function OrganizerActivationModal({
  isOpen,
  source = 'events_explorer',
  initialPhone = '',
  onClose,
  onActivated,
}: Props) {
  const { refreshProfile } = useAuth();
  const [phone, setPhone] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState('');
  const [commitmentReservedField, setCommitmentReservedField] = useState(false);
  const [commitmentNoCancellation, setCommitmentNoCancellation] = useState(false);
  const [commitmentReportIncidents, setCommitmentReportIncidents] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPhone(initialPhone);
    setCommitmentReservedField(false);
    setCommitmentNoCancellation(false);
    setCommitmentReportIncidents(false);
    setPhoneError('');
    setError('');
    trackEvent('organizer_activation_viewed', {
      source,
      channel: 'web',
    });
  }, [initialPhone, isOpen, source]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phoneValidation = validateInternationalPhone(phone);
    if (!phoneValidation.isValid) {
      setPhoneError('Ingresa un celular válido.');
      setError('');
      return;
    }

    setPending(true);
    setPhoneError('');
    setError('');

    try {
      const response = await fetch('/api/organizer/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneValidation.e164,
          source,
          commitmentReservedField,
          commitmentNoCancellation,
          commitmentReportIncidents,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo activar tu perfil organizadora.');
      }

      const supabase = getBrowserSupabase();
      await supabase.auth.refreshSession().catch(() => undefined);
      await refreshProfile().catch(() => undefined);

      trackEvent('organizer_activation_completed', {
        source,
        channel: 'web',
      });

      await onActivated();
    } catch (submitError: any) {
      const message = submitError?.message || 'No se pudo activar tu perfil organizadora.';
      if (/celular|whatsapp/i.test(message)) {
        setPhoneError(message);
      }
      trackEvent('organizer_activation_failed', {
        source,
        channel: 'web',
        reason: message,
      });
      setError(/celular|whatsapp/i.test(message) ? '' : message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 px-4 backdrop-blur-[2px]"
      onClick={() => {
        if (!pending) onClose();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (pending) return;
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Cerrar"
          disabled={pending}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="pr-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry">Crear evento</p>
          <h2 className="mt-2 text-2xl font-eastman-extrabold text-slate-900">Activa tu perfil organizadora</h2>
          <p className="mt-2 text-sm text-slate-600">
            Déjanos tu celular y acepta estos compromisos para empezar a crear eventos sin esperar aprobación
            manual.
          </p>
        </div>

        <form className="mt-6 grid gap-3" onSubmit={handleSubmit}>
          <InternationalPhoneField
            label="Celular"
            name="phone"
            placeholder="999 999 999"
            value={phone}
            onChange={(nextPhone) => {
              setPhone(nextPhone);
              if (phoneError) setPhoneError('');
            }}
            errorText={phoneError}
            size="lg"
            required
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Antes de continuar confirma esto:</p>
            <div className="mt-3 grid gap-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={commitmentReservedField}
                  onChange={(event) => setCommitmentReservedField(event.currentTarget.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry/30"
                  required
                />
                <span>Crearé eventos solo cuando la cancha ya esté reservada.</span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={commitmentNoCancellation}
                  onChange={(event) => setCommitmentNoCancellation(event.currentTarget.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry/30"
                  required
                />
                <span>No cancelaré salvo fuerza mayor y avisaré siempre a todas las inscritas.</span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={commitmentReportIncidents}
                  onChange={(event) => setCommitmentReportIncidents(event.currentTarget.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry/30"
                  required
                />
                <span>Reportaré incumplimientos a contacto@peloteras.com.</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 items-center justify-center rounded-full bg-mulberry px-6 text-sm font-semibold text-white transition hover:bg-[#470760] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? 'Activando...' : 'Continuar'}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
