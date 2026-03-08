'use client';

import { FormEvent, useState } from 'react';

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
      form.reset();
    } catch (error: any) {
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
