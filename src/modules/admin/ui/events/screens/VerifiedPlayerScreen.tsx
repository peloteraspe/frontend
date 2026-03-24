import { getAdminSupabase } from '@core/api/supabase.admin';
import { ErrorAlert, SuccessAlert, WarningAlert } from '@core/ui/Alert';
import { StatusBadge } from '@core/ui/Badge';
import { assertCanManageEvent } from '@modules/admin/api/events/services/eventPermissions.service';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type Props = {
  id: string;
  userId: string;
};

type AssistantRow = {
  id: number;
  state: string | null;
};

type TicketRow = {
  id: number;
  status: string | null;
  used_at: string | null;
};

type EventRow = {
  id: number;
  title: string | null;
  start_time: string | null;
  location_text: string | null;
};

type ProfileRow = {
  id: number;
  username: string | null;
  level_id: number | null;
};

type AuthUserLite = {
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

type LevelRow = {
  name: string | null;
};

type ProfilePositionRow = {
  position_id: number | null;
};

type PlayerPositionRow = {
  id: number;
  name: string | null;
};

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

type VerificationState = {
  title: string;
  description: string;
  variant: 'success' | 'warning' | 'error';
  badgeLabel: string;
  badgeVariant: BadgeVariant;
};

const DEFAULT_TIMEZONE = 'America/Lima';

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function emailName(email: string) {
  return normalizeText(email).split('@')[0] || '';
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

function buildPlayerUsername(params: {
  userId: string;
  profileName?: string | null;
  metadataName?: string | null;
  email?: string | null;
}) {
  const profileName = normalizeText(params.profileName);
  if (profileName) return profileName;

  const metadataName = normalizeText(params.metadataName);
  if (metadataName) return metadataName;

  const nameFromEmail = emailName(normalizeText(params.email));
  if (nameFromEmail) return nameFromEmail;

  return params.userId;
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

function mapStatusVariant(value: string | null | undefined): BadgeVariant {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'approved' || normalized === 'issued' || normalized === 'active') {
    return 'success';
  }
  if (normalized === 'pending' || normalized === 'used') return 'warning';
  if (normalized === 'rejected' || normalized === 'revoked') return 'error';
  return 'default';
}

function getVerificationState(params: {
  assistantState: string | null;
  ticketStatus: string | null;
}): VerificationState {
  const assistantState = normalizeText(params.assistantState).toLowerCase();
  const ticketStatus = normalizeText(params.ticketStatus).toLowerCase();

  if (ticketStatus === 'used') {
    return {
      title: 'Ingreso ya registrado',
      description:
        'El enlace se abrió correctamente, pero esta entrada ya había sido validada anteriormente.',
      variant: 'warning',
      badgeLabel: 'Ya usada',
      badgeVariant: 'warning',
    };
  }

  if (assistantState === 'approved' && ticketStatus !== 'revoked' && ticketStatus !== 'pending') {
    return {
      title: 'Entrada verificada',
      description:
        'El enlace se abrió correctamente y la inscripción está lista para confirmar ingreso.',
      variant: 'success',
      badgeLabel: 'Verificada',
      badgeVariant: 'success',
    };
  }

  return {
    title: 'No se pudo verificar la entrada',
    description:
      'No encontramos una inscripción aprobada activa para esta jugadora en el evento.',
    variant: 'error',
    badgeLabel: 'Sin validar',
    badgeVariant: 'error',
  };
}

function renderVerificationAlert(verification: VerificationState) {
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

  const admin = getAdminSupabase();
  const [{ data: assistant }, { data: ticket }, { data: event }, { data: profile }, authResult] =
    await Promise.all([
      admin
        .from('assistants')
        .select('id,state')
        .eq('event', parsedEventId)
        .eq('user', normalizedUserId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('ticket')
        .select('id,status,used_at')
        .eq('event_id', parsedEventId)
        .eq('user_id', normalizedUserId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('event')
        .select('id,title,start_time,location_text')
        .eq('id', parsedEventId)
        .maybeSingle(),
      admin
        .from('profile')
        .select('id,username,level_id')
        .eq('user', normalizedUserId)
        .maybeSingle(),
      admin.auth.admin.getUserById(normalizedUserId),
    ]);

  const assistantRow = (assistant as AssistantRow | null) ?? null;
  const ticketRow = (ticket as TicketRow | null) ?? null;
  const eventRow = (event as EventRow | null) ?? null;
  const profileRow = (profile as ProfileRow | null) ?? null;
  const authUser = (authResult.data?.user as AuthUserLite | null) ?? null;

  const [{ data: levelData }, { data: profilePositions }] = await Promise.all([
    typeof profileRow?.level_id === 'number'
      ? admin.from('level').select('name').eq('id', profileRow.level_id).maybeSingle()
      : Promise.resolve({ data: null }),
    typeof profileRow?.id === 'number'
      ? admin.from('profile_position').select('position_id').eq('profile_id', profileRow.id)
      : Promise.resolve({ data: [] }),
  ]);

  const positionIds = Array.from(
    new Set(
      ((profilePositions ?? []) as ProfilePositionRow[])
        .map((row) => Number(row.position_id))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  const { data: playerPositionsData } = positionIds.length
    ? await admin.from('player_position').select('id,name').in('id', positionIds)
    : { data: [] as PlayerPositionRow[] };

  const playerPositionNameById = new Map<number, string>();
  ((playerPositionsData ?? []) as PlayerPositionRow[]).forEach((row) => {
    const normalizedName = normalizeText(row.name);
    if (Number.isInteger(row.id) && row.id > 0 && normalizedName) {
      playerPositionNameById.set(row.id, normalizedName);
    }
  });

  const playerEmail = normalizeText(authUser?.email) || 'Sin correo';
  const playerUsername = buildPlayerUsername({
    userId: normalizedUserId,
    profileName: profileRow?.username,
    metadataName:
      normalizeText(authUser?.user_metadata?.username) ||
      normalizeText(authUser?.user_metadata?.full_name),
    email: playerEmail,
  });
  const playerLevel = normalizeText((levelData as LevelRow | null)?.name) || 'Sin nivel';
  const playerPositions = positionIds
    .map((positionId) => playerPositionNameById.get(positionId) || '')
    .filter(Boolean);
  const playerPositionLabel = playerPositions.length ? playerPositions.join(', ') : 'Sin posición';
  const verification = getVerificationState({
    assistantState: assistantRow?.state ?? null,
    ticketStatus: ticketRow?.status ?? null,
  });
  const eventTitle = normalizeText(eventRow?.title) || `Evento #${parsedEventId}`;

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-white shadow">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-mulberry">Verificación de ingreso</h2>
            <p className="text-sm text-slate-700">{eventTitle}</p>
          </div>
          <Link
            href={`/admin/events/${parsedEventId}/participants`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-mulberry px-3 text-sm font-medium text-mulberry"
          >
            Volver a inscripciones
          </Link>
        </div>

        <div className="space-y-5 p-4">
          {renderVerificationAlert(verification)}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado de acceso
              </p>
              <div className="mt-2">
                <StatusBadge variant={verification.badgeVariant} size="md">
                  {verification.badgeLabel}
                </StatusBadge>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {ticketRow?.id ? `#${ticketRow.id}` : 'Sin ticket'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Registro de ingreso
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {ticketRow?.used_at ? formatDateTime(ticketRow.used_at) : 'Aún no registrado'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Participante</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Datos mínimos para confirmar que la jugadora es la correcta.
                </p>
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Username
                  </p>
                  <p className="mt-1 font-medium text-slate-900">{playerUsername}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Correo
                  </p>
                  <p className="mt-1 break-all font-medium text-slate-900">{playerEmail}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Posición
                  </p>
                  <p className="mt-1 font-medium text-slate-900">{playerPositionLabel}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Nivel
                  </p>
                  <p className="mt-1 font-medium text-slate-900">{playerLevel}</p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Evento y estado</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Resumen rápido para validar el ingreso desde admin.
                </p>
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Evento
                  </p>
                  <p className="mt-1 font-medium text-slate-900">{eventTitle}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha
                  </p>
                  <p className="mt-1 text-slate-900">{formatDateTime(eventRow?.start_time)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ubicación
                  </p>
                  <p className="mt-1 text-slate-900">
                    {normalizeText(eventRow?.location_text) || 'Ubicación por confirmar'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado de inscripción
                  </p>
                  <div className="mt-2">
                    <StatusBadge variant={mapStatusVariant(assistantRow?.state)}>
                      {mapStatusLabel(assistantRow?.state)}
                    </StatusBadge>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado del ticket
                  </p>
                  <div className="mt-2">
                    <StatusBadge variant={mapStatusVariant(ticketRow?.status)}>
                      {mapStatusLabel(ticketRow?.status)}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
