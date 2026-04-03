'use client';

import { FormEvent, useState } from 'react';
import { trackEvent } from '@shared/lib/analytics';

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
};

async function submitLead(kind: LeadKind, form: HTMLFormElement) {
  const payload = Object.fromEntries(new FormData(form).entries());
  const response = await fetch('/api/leads/partners', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      leadType: kind,
      source: kind === 'admin' ? 'admin_capture_page' : 'sponsor_capture_page',
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

  return body?.message || 'Gracias. Te contactaremos pronto.';
}

export default function PartnerLeadCaptureForm({ kind }: Props) {
  const [status, setStatus] = useState<FormStatus>(initialStatus);
  const isAdmin = kind === 'admin';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ pending: true, error: '', success: '' });

    try {
      const message = await submitLead(kind, form);
      setStatus({ pending: false, error: '', success: message });
      if (kind === 'admin') {
        trackEvent('admin_request_submitted', {
          source: 'admin_capture_page',
          channel: 'web',
        });
      }
      form.reset();
    } catch (error: any) {
      if (kind === 'admin') {
        trackEvent('admin_request_failed', {
          source: 'admin_capture_page',
          channel: 'web',
          reason: error?.message || 'submit_failed',
        });
      }
      setStatus({
        pending: false,
        error: error?.message || 'No se pudo enviar tu información.',
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
          className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-mulberry"
          required
        />
        <input
          name="contactPhone"
          placeholder="WhatsApp *"
          className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-mulberry"
          required
        />
        <input
          name="district"
          placeholder="Distrito base *"
          className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-mulberry"
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
            {status.pending ? 'Enviando...' : 'Enviar postulación'}
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
        className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-mulberry"
        required
      />
      <input
        name="organizationName"
        placeholder="Marca o empresa *"
        className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-mulberry"
        required
      />
      <input
        name="contactEmail"
        type="email"
        placeholder="Correo de contacto *"
        className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-mulberry"
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
