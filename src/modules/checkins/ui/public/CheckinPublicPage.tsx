'use client';

import { useState, type FormEvent } from 'react';
import InternationalPhoneField from '@core/ui/InternationalPhoneField';
import toast from 'react-hot-toast';
import { normalizeInternationalPhone, validateInternationalPhone } from '@shared/lib/phone';
import type { CheckinPublicView } from '@modules/checkins/model/types';

function formatEventDate(value: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(parsed);
}

export default function CheckinPublicPage({ checkin }: { checkin: CheckinPublicView }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formattedEventDate = formatEventDate(checkin.event.startTime);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = normalizeInternationalPhone(phone);

    if (!normalizedPhone) {
      setPhoneError('Ingresa un celular válido.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/check-ins/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkinId: checkin.id,
          firstName,
          lastName,
          email,
          phone: normalizedPhone,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(body?.error || 'No se pudo enviar tu registro.');
        return;
      }

      setSubmitted(true);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPhoneError('');
      toast.success(body?.message || 'Registro enviado.');
    } catch {
      toast.error('No se pudo enviar tu registro.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Check-in Peloteras
        </h1>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Evento
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">{checkin.event.title}</p>
          {formattedEventDate ? (
            <p className="mt-1 text-sm text-slate-600">{formattedEventDate}</p>
          ) : null}
          {checkin.event.locationText ? (
            <p className="mt-1 text-sm text-slate-600">{checkin.event.locationText}</p>
          ) : null}
        </div>

        <div className="mt-6">
          {submitted ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Registro recibido
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Ya guardamos tus datos correctamente.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-6 inline-flex h-11 w-fit items-center justify-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760]"
              >
                Registrar a otra persona
              </button>
            </div>
          ) : (
            <>
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Nombre
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="peloteras-form-control h-12 px-3"
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    disabled={submitting}
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Apellido
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="peloteras-form-control h-12 px-3"
                    placeholder="Tu apellido"
                    autoComplete="family-name"
                    disabled={submitting}
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Correo
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    className="peloteras-form-control h-12 px-3"
                    placeholder="nombre@correo.com"
                    autoComplete="email"
                    disabled={submitting}
                    required
                  />
                </label>

                <InternationalPhoneField
                  label="Celular"
                  value={phone}
                  onChange={(nextPhone) => {
                    setPhone(nextPhone);
                    if (phoneError) setPhoneError('');
                  }}
                  onBlur={() => {
                    if (!phone.trim()) {
                      setPhoneError('');
                      return;
                    }

                    const validation = validateInternationalPhone(phone);
                    setPhoneError(validation.isValid ? '' : 'Ingresa un celular válido.');
                  }}
                  placeholder="999 999 999"
                  errorText={phoneError}
                  disabled={submitting}
                  required
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#470760] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Enviando...' : 'Enviar registro'}
                </button>
              </form>
            </>
          )}
        </div>
      </article>
    </section>
  );
}
