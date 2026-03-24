'use client';

import { useMemo, useState } from 'react';

type ValidationPayload = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
  ticket?: {
    id?: number;
    eventId?: number;
    userId?: string;
    status?: string;
    usedAt?: string;
  };
};

const DEFAULT_TIMEZONE = 'America/Lima';

function normalizeToken(raw: string) {
  const clean = raw.trim();
  if (!clean) return '';
  return clean.startsWith('PELOTERAS:TICKET:')
    ? clean.replace('PELOTERAS:TICKET:', '').trim()
    : clean;
}

export default function TicketScanAdminPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [responseCode, setResponseCode] = useState<number | null>(null);
  const [payload, setPayload] = useState<ValidationPayload | null>(null);

  const normalizedToken = useMemo(() => normalizeToken(tokenInput), [tokenInput]);

  const resultTone = useMemo(() => {
    if (!responseCode) return 'border-slate-200 bg-slate-50 text-slate-700';
    if (responseCode >= 200 && responseCode < 300)
      return 'border-emerald-300 bg-emerald-50 text-emerald-800';
    if (responseCode === 409) return 'border-amber-300 bg-amber-50 text-amber-800';
    return 'border-red-300 bg-red-50 text-red-800';
  }, [responseCode]);

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setTokenInput(text || '');
    } catch {
      // no-op
    }
  }

  async function validateTicket() {
    if (!normalizedToken || submitting) return;

    setSubmitting(true);
    setPayload(null);
    setResponseCode(null);

    try {
      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: normalizedToken }),
      });

      const body = (await res.json().catch(() => ({}))) as ValidationPayload;
      setResponseCode(res.status);
      setPayload(body);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-mulberry">Validar entrada (QR)</h2>
      <p className="mt-1 text-sm text-slate-600">
        Pega el token del QR y valida ingreso. También acepta valores con prefijo
        <code className="ml-1">PELOTERAS:TICKET:</code>.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-sm font-semibold text-slate-700" htmlFor="ticket-token">
          Token QR
        </label>
        <textarea
          id="ticket-token"
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          placeholder="PELOTERAS:TICKET:..."
          className="min-h-[100px] w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-mulberry focus:outline-none"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Pegar token
          </button>
          <button
            type="button"
            disabled={!normalizedToken || submitting}
            onClick={validateTicket}
            className="rounded-md bg-mulberry px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Validando...' : 'Validar entrada'}
          </button>
        </div>
      </div>

      <div className={`mt-5 rounded-lg border p-3 text-sm ${resultTone}`}>
        {!responseCode && <p>Aún no hay validación ejecutada.</p>}
        {responseCode && (
          <div className="space-y-1">
            <p>
              <strong>HTTP:</strong> {responseCode}
            </p>
            {(payload?.message || payload?.error) && (
              <p>
                <strong>Mensaje:</strong> {payload?.message || payload?.error}
              </p>
            )}
            {payload?.ticket?.id ? (
              <p>
                <strong>Ticket:</strong> #{payload.ticket.id} | evento {payload.ticket.eventId} | estado{' '}
                {payload.ticket.status || payload.status || 'N/A'}
              </p>
            ) : null}
            {payload?.ticket?.usedAt ? (
              <p>
                <strong>Usada en:</strong>{' '}
                {new Date(payload.ticket.usedAt).toLocaleString('es-PE', {
                  timeZone: DEFAULT_TIMEZONE,
                })}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
