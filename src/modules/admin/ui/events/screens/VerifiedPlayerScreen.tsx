import { ErrorAlert, SuccessAlert, WarningAlert } from '@core/ui/Alert';
import { StatusBadge } from '@core/ui/Badge';
import { assertCanManageEvent } from '@modules/admin/api/events/services/eventPermissions.service';
import MarkAttendanceButton from '@modules/admin/ui/events/MarkAttendanceButton';
import {
  getVerifiedPlayerData,
  type VerificationBadgeVariant,
} from '@modules/tickets/api/services/qrAttendance.service';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type Props = {
  id: string;
  userId: string;
};

const DEFAULT_TIMEZONE = 'America/Lima';

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Fecha por confirmar';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha por confirmar';

  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}

function mapStatusLabel(value: string | null | undefined) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'approved') return 'Aprobada';
  if (normalized === 'pending') return 'Pendiente';
  if (normalized === 'rejected') return 'Rechazada';
  if (normalized === 'used') return 'Usada';
  if (normalized === 'revoked') return 'Revocada';
  if (normalized === 'issued') return 'Emitida';
  if (normalized === 'active') return 'Activa';
  return normalized || 'Sin registro';
}

function mapStatusVariant(value: string | null | undefined): VerificationBadgeVariant {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'approved' || normalized === 'issued' || normalized === 'active') {
    return 'success';
  }
  if (normalized === 'pending' || normalized === 'used') return 'warning';
  if (normalized === 'rejected' || normalized === 'revoked') return 'error';
  return 'default';
}

function renderVerificationAlert(verification: {
  variant: 'success' | 'warning' | 'error';
  title: string;
  description: string;
}) {
  if (verification.variant === 'success') {
    return (
      <SuccessAlert title={verification.title}>
        <p>{verification.description}</p>
      </SuccessAlert>
    );
  }

  if (verification.variant === 'warning') {
    return (
      <WarningAlert title={verification.title}>
        <p>{verification.description}</p>
      </WarningAlert>
    );
  }

  return (
    <ErrorAlert title={verification.title}>
      <p>{verification.description}</p>
    </ErrorAlert>
  );
}

function getInitials(name: string) {
  const clean = normalizeText(name).replace(/\s+/g, ' ');
  if (!clean) return 'PL';

  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
}

function renderAvatar(name: string, avatarUrl: string | null | undefined) {
  const safeUrl = normalizeText(avatarUrl);

  if (safeUrl) {
    return (
      <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm sm:h-24 sm:w-24">
        <img
          src={safeUrl}
          alt={`Avatar de ${name}`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-xl font-black text-slate-700 shadow-sm sm:h-24 sm:w-24 sm:text-2xl">
      {getInitials(name)}
    </div>
  );
}

function DetailCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
    </div>
  );
}

export default async function VerifiedPlayerScreen({ id, userId }: Props) {
  const normalizedEventId = normalizeText(id);
  const normalizedUserId = normalizeText(userId);
  const parsedEventId = Number(normalizedEventId);

  if (!Number.isInteger(parsedEventId) || parsedEventId <= 0 || !normalizedUserId) {
    return (
      <div className="rounded-md bg-white shadow">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-mulberry">Verificación de ingreso</h2>
            <p className="text-sm text-slate-700">No se pudo interpretar el QR de acceso.</p>
          </div>
          <Link
            href="/admin/events"
            className="inline-flex h-9 items-center justify-center rounded-md border border-mulberry px-3 text-sm font-medium text-mulberry"
          >
            Volver a eventos
          </Link>
        </div>

        <div className="p-4">
          <ErrorAlert title="QR inválido">
            <p>La ruta no contiene un evento o una jugadora válidos.</p>
          </ErrorAlert>
        </div>
      </div>
    );
  }

  try {
    await assertCanManageEvent(normalizedEventId);
  } catch {
    redirect('/admin/events');
  }

  const data = await getVerifiedPlayerData({
    eventId: parsedEventId,
    userId: normalizedUserId,
    ensureTicket: true,
  });
  const playerPositionLabel = data.player.positions.length
    ? data.player.positions.join(', ')
    : 'Sin posición';
  const attendanceTimeLabel = data.ticket.usedAt ? formatDateTime(data.ticket.usedAt) : 'Aún no registrada';
  const eventDateLabel = formatDateTime(data.event.startTime);
  const locationLabel = normalizeText(data.event.locationText) || 'Ubicación por confirmar';

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Verificación de QR</h1>
            <p className="mt-2 text-sm text-slate-600">
              Revisa la inscripción, el ticket y marca la asistencia de la jugadora cuando
              corresponda.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <StatusBadge variant={data.verification.badgeVariant} size="md">
              {data.verification.badgeLabel}
            </StatusBadge>
            <Link
              href={`/admin/events/${parsedEventId}/participants`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-mulberry px-4 text-sm font-semibold text-mulberry transition hover:bg-mulberry hover:text-white"
            >
              Volver a inscripciones
            </Link>
          </div>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        {renderVerificationAlert(data.verification)}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="order-1 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  {renderAvatar(data.player.username, data.player.avatarUrl)}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry">
                      Jugadora
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                      {data.player.username}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{data.player.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge variant={mapStatusVariant(data.assistant.state)}>
                    Inscripción: {mapStatusLabel(data.assistant.state)}
                  </StatusBadge>
                  <StatusBadge variant={mapStatusVariant(data.ticket.status)}>
                    Ticket: {mapStatusLabel(data.ticket.status)}
                  </StatusBadge>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-mulberry/15 bg-mulberry/5 p-4">
                <MarkAttendanceButton
                  eventId={data.eventId}
                  userId={data.userId}
                  canMarkAttendance={data.verification.canMarkAttendance}
                  actionLabel={data.verification.actionLabel}
                  actionHint={data.verification.actionHint}
                />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailCard label="Nivel" value={data.player.level} />
                <DetailCard label="Posición" value={playerPositionLabel} />
                <DetailCard
                  label="Ticket"
                  value={data.ticket.id ? `#${data.ticket.id}` : 'Sin ticket'}
                  hint={data.ticket.id ? 'Ticket emitido para el ingreso.' : 'Todavía no existe ticket válido.'}
                />
                <DetailCard label="Asistencia" value={attendanceTimeLabel} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry">
                    Evento
                  </p>
                  <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    {data.event.title}
                  </h3>
                </div>
                <StatusBadge variant={data.verification.badgeVariant}>{data.verification.title}</StatusBadge>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DetailCard label="Fecha" value={eventDateLabel} />
                <DetailCard label="Ubicación" value={locationLabel} />
                <DetailCard
                  label="Estado de inscripción"
                  value={mapStatusLabel(data.assistant.state)}
                  hint="Este estado refleja cómo está la inscripción de la jugadora en el evento."
                />
                <DetailCard
                  label="Estado del ticket"
                  value={mapStatusLabel(data.ticket.status)}
                  hint="El ticket cambia a usada cuando se marca la asistencia."
                />
              </div>
            </section>
          </div>

          <aside className="order-2 space-y-6 xl:order-2">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry">
                  Control de asistencia
                </p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Check-in de jugadora
                </h3>
                <p className="mt-2 text-sm text-slate-600">{data.verification.description}</p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusBadge variant={data.verification.badgeVariant} size="md">
                      {data.verification.badgeLabel}
                    </StatusBadge>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Acción principal
                    </p>
                  </div>

                  <MarkAttendanceButton
                    eventId={data.eventId}
                    userId={data.userId}
                    canMarkAttendance={data.verification.canMarkAttendance}
                    actionLabel={data.verification.actionLabel}
                    actionHint={data.verification.actionHint}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Hora de asistencia
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{attendanceTimeLabel}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Estado actual
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {data.verification.title}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry">
                Resumen rápido
              </p>
              <div className="mt-4 space-y-3">
                <DetailCard label="Jugadora" value={data.player.username} hint={data.player.email} />
                <DetailCard label="Evento" value={data.event.title} hint={eventDateLabel} />
                <DetailCard
                  label="Ubicación"
                  value={locationLabel}
                  hint={data.ticket.id ? `Ticket #${data.ticket.id}` : 'Sin ticket emitido'}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
