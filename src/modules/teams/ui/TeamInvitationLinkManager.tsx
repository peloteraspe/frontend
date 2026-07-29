'use client';

import { ArrowPathIcon, ClipboardDocumentIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { trackEvent } from '@shared/lib/analytics';

export default function TeamInvitationLinkManager({ teamId }: { teamId: number }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadLink() {
    if (link || loading) return link;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/teams/${teamId}/invitation-link`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!response.ok || !payload.link) throw new Error(payload.error || 'No se pudo obtener el enlace.');
      setLink(payload.link);
      return payload.link;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo obtener el enlace.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    const value = (await loadLink()) || link;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Enlace copiado.');
      trackEvent('team_invitation_link_copied', { team_id: teamId });
    } catch {
      setMessage('No pudimos copiarlo automáticamente. Selecciona el enlace manualmente.');
    }
  }

  async function regenerate() {
    if (!window.confirm('El enlace anterior dejará de funcionar inmediatamente. ¿Deseas continuar?')) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/teams/${teamId}/invitation-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = (await response.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!response.ok || !payload.link) throw new Error(payload.error || 'No se pudo regenerar el enlace.');
      setLink(payload.link);
      setMessage('Se creó un nuevo enlace. El anterior ya no funciona.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo regenerar el enlace.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mulberry/10 text-mulberry">
          <LinkIcon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-950">Enlace para convocar</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">Compártelo por WhatsApp o redes. Cada jugadora deberá aceptar.</p>
        </div>
      </div>

      {link ? (
        <input readOnly value={link} onFocus={(event) => event.currentTarget.select()} aria-label="Enlace general de invitación" className="mt-4 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600" />
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={copyLink} disabled={loading} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-mulberry px-3 text-xs font-semibold text-white disabled:opacity-60">
          <ClipboardDocumentIcon aria-hidden="true" className="h-4 w-4" />
          {loading ? 'Cargando…' : 'Copiar enlace'}
        </button>
        <button type="button" onClick={regenerate} disabled={loading} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          <ArrowPathIcon aria-hidden="true" className="h-4 w-4" />
          Regenerar
        </button>
      </div>
      {message ? <p role="status" className="mt-3 text-xs leading-5 text-slate-600">{message}</p> : null}
    </section>
  );
}
