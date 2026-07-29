'use client';

import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type {
  TeamInvitationCard,
  TeamInvitationStatus,
} from '@modules/teams/model/types';
import { buildPublicTeamPath } from '@shared/lib/publicProfilePaths';
import { notifyTeamInvitationsChanged } from './usePendingTeamInvitationCount';

const STATUS_LABELS: Record<TeamInvitationStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  expired: 'Vencida',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function TeamAvatar({ invitation }: { invitation: TeamInvitationCard }) {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-mulberry/10 text-lg font-bold uppercase text-mulberry">
      {invitation.team.avatar_url ? (
        <img
          src={invitation.team.avatar_url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        invitation.team.name.slice(0, 1)
      )}
    </span>
  );
}

function InvitationCard({
  invitation,
  highlighted,
  onRespond,
}: {
  invitation: TeamInvitationCard;
  highlighted: boolean;
  onRespond: (invitation: TeamInvitationCard, response: 'accepted' | 'rejected') => void;
}) {
  const pending = invitation.status === 'pending';

  return (
    <article
      className={`rounded-3xl border bg-white p-5 shadow-sm transition sm:p-6 ${
        highlighted ? 'border-mulberry ring-4 ring-mulberry/10' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-4">
        <TeamAvatar invitation={invitation} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{invitation.team.name}</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Convocada por {invitation.captainUsername ? `@${invitation.captainUsername}` : 'la capitana'}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                pending
                  ? 'bg-amber-100 text-amber-800'
                  : invitation.status === 'accepted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
              }`}
            >
              {STATUS_LABELS[invitation.status]}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDaysIcon aria-hidden="true" className="h-4 w-4" />
              Recibida el {formatDate(invitation.createdAt)}
            </span>
            {pending ? (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon aria-hidden="true" className="h-4 w-4" />
                Vence el {formatDate(invitation.expiresAt)}
              </span>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={buildPublicTeamPath(invitation.team.slug)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver equipo
            </Link>
            {pending ? (
              <>
                <button
                  type="button"
                  onClick={() => onRespond(invitation, 'accepted')}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-mulberry px-4 text-sm font-semibold text-white hover:bg-mulberry/90"
                >
                  <CheckCircleIcon aria-hidden="true" className="h-4 w-4" />
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => onRespond(invitation, 'rejected')}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <XCircleIcon aria-hidden="true" className="h-4 w-4" />
                  Rechazar
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TeamInvitationsPage({
  initialInvitations,
  highlightedInvitationId = null,
}: {
  initialInvitations: TeamInvitationCard[];
  highlightedInvitationId?: number | null;
}) {
  const router = useRouter();
  const [invitations, setInvitations] = useState(initialInvitations);
  const [confirmation, setConfirmation] = useState<{
    invitation: TeamInvitationCard;
    response: 'accepted' | 'rejected';
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = useMemo(
    () => invitations.filter((invitation) => invitation.status === 'pending'),
    [invitations]
  );
  const history = useMemo(
    () =>
      invitations
        .filter((invitation) => invitation.status !== 'pending')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [invitations]
  );

  async function confirmResponse() {
    if (!confirmation || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/team-invitations/${confirmation.invitation.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response: confirmation.response }),
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        invitation?: { status?: TeamInvitationStatus };
        status?: TeamInvitationStatus;
        error?: string;
      };

      if (!response.ok || !payload.invitation?.status) {
        if (payload.status === 'expired') {
          setInvitations((current) =>
            current.map((item) =>
              item.id === confirmation.invitation.id
                ? { ...item, status: 'expired', updatedAt: new Date().toISOString() }
                : item
            )
          );
          notifyTeamInvitationsChanged();
        }
        throw new Error(payload.error || 'No se pudo responder la convocatoria.');
      }

      setInvitations((current) =>
        current.map((item) =>
          item.id === confirmation.invitation.id
            ? {
                ...item,
                status: payload.invitation?.status || item.status,
                respondedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      setConfirmation(null);
      notifyTeamInvitationsChanged();
      router.refresh();
    } catch (responseError) {
      setError(
        responseError instanceof Error
          ? responseError.message
          : 'No se pudo responder la convocatoria.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="site-shell w-full py-7 sm:py-10">
      <header className="rounded-3xl bg-[linear-gradient(125deg,#54086F_0%,#7B2A91_58%,#F0815B_145%)] px-6 py-8 text-white shadow-lg sm:px-9 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Equipos</p>
        <h1 className="mt-2 font-eastman-extrabold text-3xl font-extrabold sm:text-4xl">Convocatorias</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
          Revisa los equipos que te invitaron y decide cuándo incorporarte.
        </p>
      </header>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {invitations.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <UserGroupIcon aria-hidden="true" className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Aún no tienes convocatorias</h2>
          <p className="mt-1 text-sm text-slate-500">Cuando una capitana te invite, aparecerá aquí.</p>
        </section>
      ) : (
        <div className="mt-7 space-y-9">
          <section aria-labelledby="pending-invitations-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="pending-invitations-title" className="text-2xl font-semibold text-slate-950">Pendientes</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">{pending.length}</span>
            </div>
            {pending.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {pending.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    highlighted={invitation.id === highlightedInvitationId}
                    onRespond={(item, response) => {
                      setError(null);
                      setConfirmation({ invitation: item, response });
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No tienes convocatorias pendientes.</p>
            )}
          </section>

          {history.length ? (
            <section aria-labelledby="invitation-history-title">
              <h2 id="invitation-history-title" className="mb-4 text-2xl font-semibold text-slate-950">Historial</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {history.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    highlighted={invitation.id === highlightedInvitationId}
                    onRespond={() => undefined}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {confirmation ? (
        <div role="dialog" aria-modal="true" aria-labelledby="response-confirmation-title" className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="response-confirmation-title" className="text-xl font-semibold text-slate-950">
                  {confirmation.response === 'accepted' ? '¿Aceptar convocatoria?' : '¿Rechazar convocatoria?'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {confirmation.response === 'accepted'
                    ? `Te incorporarás como jugadora de ${confirmation.invitation.team.name}.`
                    : `La convocatoria de ${confirmation.invitation.team.name} pasará a tu historial.`}
                </p>
              </div>
              <button type="button" onClick={() => setConfirmation(null)} disabled={submitting} aria-label="Cerrar confirmación" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <XMarkIcon aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmation(null)} disabled={submitting} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-60">Volver</button>
              <button type="button" onClick={confirmResponse} disabled={submitting} className={`h-11 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60 ${confirmation.response === 'accepted' ? 'bg-mulberry' : 'bg-rose-600'}`}>
                {submitting ? 'Guardando…' : confirmation.response === 'accepted' ? 'Sí, aceptar' : 'Sí, rechazar'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
