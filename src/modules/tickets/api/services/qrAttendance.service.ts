import 'server-only';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import { ensureTicketForAssistant } from './tickets.service';

type AssistantRow = {
  id: number;
  state: string | null;
};

type TicketRow = {
  id: number;
  status: string | null;
  used_at: string | null;
  qr_token?: string | null;
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

export type VerificationBadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export type VerificationSummary = {
  title: string;
  description: string;
  variant: 'success' | 'warning' | 'error';
  badgeLabel: string;
  badgeVariant: VerificationBadgeVariant;
  canMarkAttendance: boolean;
  actionLabel: string;
  actionHint: string | null;
};

export type VerifiedPlayerData = {
  eventId: number;
  userId: string;
  event: {
    id: number | null;
    title: string;
    startTime: string | null;
    locationText: string | null;
  };
  assistant: {
    id: number | null;
    state: string | null;
  };
  ticket: {
    id: number | null;
    status: string | null;
    usedAt: string | null;
    qrToken: string | null;
  };
  player: {
    username: string;
    email: string;
    level: string;
    positions: string[];
    avatarUrl: string | null;
  };
  verification: VerificationSummary;
};

export type MarkAttendanceResult =
  | {
      ok: true;
      status: 'used';
      message: string;
      usedAt: string;
      ticketId: number;
      eventId: number;
      userId: string;
    }
  | {
      ok: false;
      status: 'used' | 'not_registered' | 'missing_ticket' | 'ticket_not_active';
      message: string;
      usedAt: string | null;
      ticketId: number | null;
      eventId: number;
      userId: string;
    };

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function emailName(email: string) {
  return normalizeText(email).split('@')[0] || '';
}

function resolveAvatarUrl(metadata: Record<string, any> | null | undefined) {
  if (!metadata) return null;
  const candidates = [
    metadata.avatar,
    metadata.avatar_url,
    metadata.picture,
    metadata.photoURL,
    metadata.profile_image_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
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

function buildVerificationSummary(params: {
  assistantState: string | null;
  ticketStatus: string | null;
  ticketId: number | null;
}) {
  const assistantState = normalizeText(params.assistantState).toLowerCase();
  const ticketStatus = normalizeText(params.ticketStatus).toLowerCase();

  if (!assistantState && !ticketStatus) {
    return {
      title: 'Registro no encontrado',
      description: 'No encontramos una inscripción asociada a este QR para el evento.',
      variant: 'error',
      badgeLabel: 'Sin registro',
      badgeVariant: 'error',
      canMarkAttendance: false,
      actionLabel: 'No disponible',
      actionHint: 'Este QR no está asociado a una inscripción válida.',
    } satisfies VerificationSummary;
  }

  if (ticketStatus === 'used') {
    return {
      title: 'Asistencia ya marcada',
      description: 'La jugadora ya registró su ingreso anteriormente con esta entrada.',
      variant: 'warning',
      badgeLabel: 'Asistió',
      badgeVariant: 'warning',
      canMarkAttendance: false,
      actionLabel: 'Asistencia registrada',
      actionHint: 'No se puede volver a marcar asistencia para una entrada ya usada.',
    } satisfies VerificationSummary;
  }

  if (assistantState === 'approved' && ticketStatus === 'active') {
    return {
      title: 'Lista para marcar asistencia',
      description: 'La inscripción está aprobada y la entrada está activa para registrar ingreso.',
      variant: 'success',
      badgeLabel: 'Lista para ingreso',
      badgeVariant: 'success',
      canMarkAttendance: true,
      actionLabel: 'Marcar asistencia',
      actionHint: 'El QR quedará usado y no podrá reutilizarse.',
    } satisfies VerificationSummary;
  }

  if (assistantState === 'approved' && !params.ticketId) {
    return {
      title: 'Ticket no sincronizado',
      description:
        'La inscripción figura aprobada, pero no encontramos una entrada emitida para registrar asistencia.',
      variant: 'warning',
      badgeLabel: 'Sin ticket',
      badgeVariant: 'warning',
      canMarkAttendance: false,
      actionLabel: 'No disponible',
      actionHint: 'Vuelve a emitir o sincronizar la entrada antes de marcar asistencia.',
    } satisfies VerificationSummary;
  }

  if (assistantState === 'pending' || ticketStatus === 'pending') {
    return {
      title: 'Entrada pendiente',
      description: 'La inscripción o la entrada aún no está aprobada para registrar ingreso.',
      variant: 'warning',
      badgeLabel: 'Pendiente',
      badgeVariant: 'warning',
      canMarkAttendance: false,
      actionLabel: 'Pendiente de aprobación',
      actionHint: 'Revisa el estado del pago o la emisión de la entrada antes del ingreso.',
    } satisfies VerificationSummary;
  }

  if (assistantState === 'rejected' || ticketStatus === 'revoked') {
    return {
      title: 'Entrada no habilitada',
      description: 'La inscripción fue rechazada o la entrada fue revocada para este evento.',
      variant: 'error',
      badgeLabel: 'Bloqueada',
      badgeVariant: 'error',
      canMarkAttendance: false,
      actionLabel: 'No disponible',
      actionHint: 'Solo se puede marcar asistencia con entradas activas y aprobadas.',
    } satisfies VerificationSummary;
  }

  return {
    title: 'Estado por revisar',
    description: 'La admin puede revisar la ficha, pero esta entrada no está lista para registrar ingreso.',
    variant: 'warning',
    badgeLabel: 'Por revisar',
    badgeVariant: 'warning',
    canMarkAttendance: false,
    actionLabel: 'No disponible',
    actionHint: 'Verifica el estado de la inscripción y de la entrada antes de continuar.',
  } satisfies VerificationSummary;
}

export async function getVerifiedPlayerData(params: {
  eventId: string | number;
  userId: string;
  ensureTicket?: boolean;
}): Promise<VerifiedPlayerData> {
  const normalizedEventId = Number(params.eventId);
  const normalizedUserId = normalizeText(params.userId);

  if (!Number.isInteger(normalizedEventId) || normalizedEventId <= 0 || !normalizedUserId) {
    throw new Error('Invalid verification payload.');
  }

  const admin = getAdminSupabase();
  const [{ data: assistant }, { data: ticket }, { data: event }, { data: profile }, authResult] =
    await Promise.all([
      admin
        .from('assistants')
        .select('id,state')
        .eq('event', normalizedEventId)
        .eq('user', normalizedUserId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('ticket')
        .select('id,status,used_at,qr_token')
        .eq('event_id', normalizedEventId)
        .eq('user_id', normalizedUserId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('event')
        .select('id,title,start_time,location_text')
        .eq('id', normalizedEventId)
        .maybeSingle(),
      admin
        .from('profile')
        .select('id,username,level_id')
        .eq('user', normalizedUserId)
        .maybeSingle(),
      admin.auth.admin.getUserById(normalizedUserId),
    ]);

  const assistantRow = (assistant as AssistantRow | null) ?? null;
  let ticketRow = (ticket as TicketRow | null) ?? null;
  const eventRow = (event as EventRow | null) ?? null;
  const profileRow = (profile as ProfileRow | null) ?? null;
  const authUser = (authResult.data?.user as AuthUserLite | null) ?? null;

  if (!ticketRow && assistantRow && params.ensureTicket !== false) {
    try {
      const ensured = await ensureTicketForAssistant(admin, assistantRow.id);
      if (ensured.ticket) {
        ticketRow = {
          id: ensured.ticket.id,
          status: ensured.ticket.status,
          used_at: null,
          qr_token: ensured.ticket.qr_token,
        };
      }
    } catch (ticketError) {
      log.warn('Could not self-heal missing ticket while loading QR verification', 'TICKETS', {
        eventId: normalizedEventId,
        userId: normalizedUserId,
        assistantId: assistantRow.id,
        error: ticketError,
      });
    }
  }

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
  const avatarUrl = resolveAvatarUrl(authUser?.user_metadata);

  return {
    eventId: normalizedEventId,
    userId: normalizedUserId,
    event: {
      id: eventRow?.id ?? null,
      title: normalizeText(eventRow?.title) || `Evento #${normalizedEventId}`,
      startTime: eventRow?.start_time ?? null,
      locationText: eventRow?.location_text ?? null,
    },
    assistant: {
      id: assistantRow?.id ?? null,
      state: assistantRow?.state ?? null,
    },
    ticket: {
      id: ticketRow?.id ?? null,
      status: ticketRow?.status ?? null,
      usedAt: ticketRow?.used_at ?? null,
      qrToken: ticketRow?.qr_token ?? null,
    },
    player: {
      username: playerUsername,
      email: playerEmail,
      level: playerLevel,
      positions: playerPositions,
      avatarUrl,
    },
    verification: buildVerificationSummary({
      assistantState: assistantRow?.state ?? null,
      ticketStatus: ticketRow?.status ?? null,
      ticketId: ticketRow?.id ?? null,
    }),
  };
}

export async function markAttendance(params: {
  eventId: string | number;
  userId: string;
}): Promise<MarkAttendanceResult> {
  const data = await getVerifiedPlayerData({
    eventId: params.eventId,
    userId: params.userId,
    ensureTicket: true,
  });

  if (!data.assistant.id) {
    return {
      ok: false,
      status: 'not_registered',
      message: 'No encontramos una inscripción para esta jugadora en el evento.',
      usedAt: null,
      ticketId: null,
      eventId: data.eventId,
      userId: data.userId,
    };
  }

  if (!data.ticket.id) {
    return {
      ok: false,
      status: 'missing_ticket',
      message: 'La inscripción no tiene una entrada emitida para registrar asistencia.',
      usedAt: null,
      ticketId: null,
      eventId: data.eventId,
      userId: data.userId,
    };
  }

  if (normalizeText(data.ticket.status).toLowerCase() === 'used') {
    return {
      ok: false,
      status: 'used',
      message: 'La asistencia ya había sido marcada anteriormente.',
      usedAt: data.ticket.usedAt,
      ticketId: data.ticket.id,
      eventId: data.eventId,
      userId: data.userId,
    };
  }

  if (normalizeText(data.assistant.state).toLowerCase() !== 'approved') {
    return {
      ok: false,
      status: 'ticket_not_active',
      message: 'La inscripción no está aprobada. No se puede marcar asistencia.',
      usedAt: null,
      ticketId: data.ticket.id,
      eventId: data.eventId,
      userId: data.userId,
    };
  }

  if (normalizeText(data.ticket.status).toLowerCase() !== 'active') {
    return {
      ok: false,
      status: 'ticket_not_active',
      message: 'La entrada no está activa para registrar asistencia.',
      usedAt: null,
      ticketId: data.ticket.id,
      eventId: data.eventId,
      userId: data.userId,
    };
  }

  const usedAt = new Date().toISOString();
  const admin = getAdminSupabase();
  const { data: updated, error: updateError } = await admin
    .from('ticket')
    .update({
      status: 'used',
      used_at: usedAt,
      updated_at: usedAt,
    })
    .eq('id', data.ticket.id)
    .eq('status', 'active')
    .is('used_at', null)
    .select('id,status,used_at')
    .maybeSingle();

  if (updateError) {
    log.database('UPDATE ticket used from QR verification', 'ticket', updateError, {
      eventId: data.eventId,
      userId: data.userId,
      ticketId: data.ticket.id,
    });
    throw new Error('No se pudo marcar la asistencia.');
  }

  if (!updated) {
    const { data: latestTicket, error: latestTicketError } = await admin
      .from('ticket')
      .select('id,status,used_at')
      .eq('id', data.ticket.id)
      .maybeSingle();

    if (latestTicketError) {
      log.database('SELECT ticket after QR attendance conflict', 'ticket', latestTicketError, {
        eventId: data.eventId,
        userId: data.userId,
        ticketId: data.ticket.id,
      });
      throw new Error('No se pudo confirmar el estado final de la asistencia.');
    }

    if (latestTicket && (
      normalizeText(latestTicket.status).toLowerCase() === 'used' ||
      Boolean(latestTicket.used_at)
    )) {
      return {
        ok: false,
        status: 'used',
        message: 'La asistencia ya había sido marcada anteriormente.',
        usedAt: latestTicket.used_at,
        ticketId: latestTicket.id,
        eventId: data.eventId,
        userId: data.userId,
      };
    }

    return {
      ok: false,
      status: 'ticket_not_active',
      message: 'La entrada ya no está activa para registrar asistencia.',
      usedAt: latestTicket?.used_at ?? null,
      ticketId: latestTicket?.id ?? data.ticket.id,
      eventId: data.eventId,
      userId: data.userId,
    };
  }

  return {
    ok: true,
    status: 'used',
    message: 'Asistencia marcada correctamente.',
    usedAt: updated.used_at,
    ticketId: updated.id,
    eventId: data.eventId,
    userId: data.userId,
  };
}
