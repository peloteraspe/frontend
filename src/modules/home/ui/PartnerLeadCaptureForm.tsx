'use client';

import { FormEvent, useState } from 'react';
import InternationalPhoneField from '@core/ui/InternationalPhoneField';
import { trackEvent } from '@shared/lib/analytics';
import { validateInternationalPhone } from '@shared/lib/phone';

type LeadKind = 'admin' | 'sponsor';

type FormStatus = {
  pending: boolean;
  error: string;
  success: string;
};

const initialStatus: FormStatus = {
  pending: false,
  error: '',
  success: '',
};

type Props = {
  kind: LeadKind;
  source?: string;
};

async function submitLead(
  kind: LeadKind,
  source: string,
  form: HTMLFormElement,
  overrides?: Record<string, string>
) {
  const payload = {
    ...Object.fromEntries(new FormData(form).entries()),
    ...(overrides || {}),
  };
  const response = await fetch('/api/leads/partners', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      leadType: kind,
      source,
      ...payload,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body?.error || body?.message || 'No se pudo enviar tu información.');
  }

  return body?.message || (kind === 'admin'
    ? 'Gracias. Nuestro equipo te contactará para ayudarte a activar tu perfil.'
    : 'Gracias. Te contactaremos pronto.');
}

export default function PartnerLeadCaptureForm({
  kind,
  source = kind === 'admin' ? 'admin_capture_page' : 'sponsor_capture_page',
}: Props) {
  const [status, setStatus] = useState<FormStatus>(initialStatus);
  const [contactPhone, setContactPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const isAdmin = kind === 'admin';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ pending: true, error: '', success: '' });
    setPhoneError('');
    const phoneValidation = isAdmin ? validateInternationalPhone(contactPhone) : null;

    if (isAdmin) {
      if (!phoneValidation?.isValid) {
        setPhoneError('Ingresa un WhatsApp válido.');
        setStatus({ pending: false, error: '', success: '' });
        return;
      }
    }

    try {
      const message = await submitLead(
        kind,
        source,
        form,
        isAdmin && phoneValidation ? { contactPhone: phoneValidation.e164 } : undefined
      );
      setStatus({ pending: false, error: '', success: message });
      setPhoneError('');
      if (kind === 'admin') {
        trackEvent('admin_request_submitted', {
          source,
          channel: 'web',
        });
        trackEvent('create_event_support_requested', {
          source,
          channel: 'web',
        });
      }
      form.reset();
      setContactPhone('');
    } catch (error: any) {
      const message = error?.message || 'No se pudo enviar tu información.';
      if (isAdmin && /whatsapp|celular/i.test(message)) {
        setPhoneError(message);
      }
      if (kind === 'admin') {
        trackEvent('admin_request_failed', {
          source,
          channel: 'web',
          reason: message || 'submit_failed',
        });
        trackEvent('create_event_support_request_failed', {
          source,
          channel: 'web',
          reason: message || 'submit_failed',
        });
      }
      setStatus({
        pending: false,
        error: /whatsapp|celular/i.test(message) ? '' : message,
        success: '',
      });
    }
  }

  if (isAdmin) {
    return (
      <form className="mt-6 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <input
          name="contactName"
          placeholder="Nombre completo *"
          className="peloteras-form-control h-11"
          required
        />
        <InternationalPhoneField
          name="contactPhone"
          placeholder="WhatsApp *"
          value={contactPhone}
          onChange={(phone) => {
            setContactPhone(phone);
            if (phoneError) setPhoneError('');
          }}
          errorText={phoneError}
          required
        />
        <input
          name="district"
          placeholder="Distrito base *"
          className="peloteras-form-control h-11"
          required
        />
        <p className="text-xs text-slate-500 md:col-span-2">
          Solo te pedimos 3 datos para contactarte rápido.
        </p>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 md:col-span-2">
          <input
            type="checkbox"
            name="commitmentReservedField"
            value="true"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry/30"
            required
          />
          <span>Confirmo que solo crearé eventos cuando el espacio de juego ya esté reservado.</span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 md:col-span-2">
          <input
            type="checkbox"
            name="commitmentNoCancellation"
            value="true"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry/30"
            required
          />
          <span>
            Entiendo que no debo cancelar el evento salvo fuerza mayor y que debo avisar siempre a todas las
            inscritas.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 md:col-span-2">
          <input
            type="checkbox"
            name="commitmentReportIncidents"
            value="true"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry/30"
            required
          />
          <span>Me comprometo a reportar incumplimientos a contacto@peloteras.com.</span>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={status.pending}
            className="inline-flex h-11 items-center rounded-full bg-mulberry px-6 text-sm font-semibold text-white transition hover:bg-[#470760] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status.pending ? 'Enviando...' : 'Pedir ayuda para activar mi perfil'}
          </button>
        </div>
        {status.error ? <p className="text-sm text-red-600 md:col-span-2">{status.error}</p> : null}
        {status.success ? <p className="text-sm text-emerald-700 md:col-span-2">{status.success}</p> : null}
      </form>
    );
  }

  return (
    <form className="mt-6 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
      <input
        name="contactName"
        placeholder="Nombre de contacto *"
        className="peloteras-form-control h-11"
        required
      />
      <input
        name="organizationName"
        placeholder="Marca o empresa *"
        className="peloteras-form-control h-11"
        required
      />
      <input
        name="contactEmail"
        type="email"
        placeholder="Correo de contacto *"
        className="peloteras-form-control h-11"
        required
      />
      <p className="text-xs text-slate-500 md:col-span-2">
        Solo te pedimos 3 datos para enviarte una propuesta inicial.
      </p>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={status.pending}
          className="inline-flex h-11 items-center rounded-full bg-mulberry px-6 text-sm font-semibold text-white transition hover:bg-[#470760] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status.pending ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </div>
      {status.error ? <p className="text-sm text-red-600 md:col-span-2">{status.error}</p> : null}
      {status.success ? <p className="text-sm text-emerald-700 md:col-span-2">{status.success}</p> : null}
    </form>
  );
}
