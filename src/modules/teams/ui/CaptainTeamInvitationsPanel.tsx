'use client';

import { EnvelopeIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import type {
  CaptainTeamInvitationCard,
  TeamInvitationStatus,
} from '@modules/teams/model/types';

const STATUS_LABELS: Record<TeamInvitationStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  expired: 'Vencida',
};

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function CaptainTeamInvitationsPanel({
  initialInvitations,
}: {
  initialInvitations: CaptainTeamInvitationCard[];
}) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [filter, setFilter] = useState<'all' | TeamInvitationStatus>('all');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = useMemo(
    () =>
      filter === 'all'
        ? invitations
        : invitations.filter((invitation) => invitation.status === filter),
    [filter, invitations]
  );

  async function cancelInvitation(invitation: CaptainTeamInvitationCard) {
    if (!window.confirm(`¿Cancelar la convocatoria de @${invitation.username || 'esta jugadora'}?`)) {
      return;
    }

    setCancellingId(invitation.id);
    setError(null);
    try {
      const response = await fetch(`/api/team-invitations/${invitation.id}/cancel`, {
        method: 'POST',
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'No se pudo cancelar.');

      setInvitations((current) =>
        current.map((item) =>
          item.id === invitation.id
            ? { ...item, status: 'cancelled', cancelledAt: new Date().toISOString() }
            : item
        )
      );
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'No se pudo cancelar.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section aria-labelledby="captain-invitations-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mulberry">Administración</p>
          <h2 id="captain-invitations-title" className="mt-1 text-2xl font-semibold text-slate-950">Convocatorias enviadas</h2>
          <p className="mt-1 text-sm text-slate-500">Revisa respuestas y entregas de correo.</p>
        </div>
        <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Filtrar convocatorias por estado" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="accepted">Aceptadas</option>
          <option value="rejected">Rechazadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="expired">Vencidas</option>
        </select>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}

      {visible.length ? (
        <ul className="mt-4 divide-y divide-slate-100">
          {visible.map((invitation) => (
            <li key={invitation.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mulberry/10 text-mulberry">
                <UserPlusIcon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {invitation.username ? `@${invitation.username}` : invitation.maskedEmail || 'Jugadora invitada'}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{formatDate(invitation.createdAt)}</span>
                  <span>{STATUS_LABELS[invitation.status]}</span>
                  <span className="inline-flex items-center gap-1">
                    <EnvelopeIcon aria-hidden="true" className="h-3.5 w-3.5" />
                    {invitation.emailDeliveryStatus === 'sent'
                      ? 'Correo enviado'
                      : invitation.emailDeliveryStatus === 'failed'
                        ? 'Correo fallido'
                        : invitation.emailDeliveryStatus === 'not_applicable'
                          ? 'Sin correo'
                          : 'Correo pendiente'}
                  </span>
                </div>
              </div>
              {invitation.status === 'pending' ? (
                <button type="button" onClick={() => cancelInvitation(invitation)} disabled={cancellingId === invitation.id} className="h-9 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                  {cancellingId === invitation.id ? 'Cancelando…' : 'Cancelar'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No hay convocatorias en este estado.
        </div>
      )}
    </section>
  );
}
