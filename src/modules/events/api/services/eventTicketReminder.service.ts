import 'server-only';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import {
  sendPersonalizedEventAnnouncementEmails,
  type PersonalizedEventAnnouncementRecipientInput,
} from '@modules/admin/api/events/services/eventAnnouncementEmail.service';
import { ensureTicketForAssistant } from '@modules/tickets/api/services/tickets.service';

const DEFAULT_TZ = 'America/Lima';
const REMINDER_TYPE = 'event_starts_in_1_hour';
const WINDOW_START_MINUTES = 55;
const WINDOW_END_MINUTES = 60;
const PROCESSING_STALE_MS = 15 * 60 * 1000;
const REMINDER_TABLE = 'event_ticket_reminder_delivery';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EventRow = {
  id: number;
  title: string | null;
  start_time: string | null;
  location_text: string | null;
};

type AssistantRow = {
  id: number;
  event: number | null;
  user: string | null;
  state: string | null;
};

type ProfileRow = {
  user: string;
  username: string | null;
};

type AuthUserLite = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

type ReminderDeliveryRow = {
  id: number;
  status: string | null;
  updated_at: string | null;
};

type ReminderCandidate = {
  assistantId: number;
  eventId: number;
  userId: string;
  email: string;
  name: string;
  eventTitle: string;
  eventStartTime: string;
  eventLocation: string;
};

export type SendEventTicketReminderResult = {
  processedEventCount: number;
  candidateCount: number;
  reservedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
};

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeUserId(value: unknown) {
  return String(value ?? '').trim();
}

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveBaseUrl(baseUrl: string) {
  const trimmed = trimTrailingSlash(normalizeText(baseUrl));
  if (!trimmed) {
    return 'https://peloteras.com';
  }

  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return 'https://peloteras.com';
    }

    return trimTrailingSlash(parsed.toString());
  } catch {
    return 'https://peloteras.com';
  }
}

function buildTicketUrl(baseUrl: string, userId: string) {
  const normalizedBaseUrl = resolveBaseUrl(baseUrl);
  return new URL(`/tickets/${encodeURIComponent(userId)}`, normalizedBaseUrl).toString();
}

function formatEventDate(startTime: string) {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return 'Por confirmar';

  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: DEFAULT_TZ,
  });
}

function formatEventTime(startTime: string) {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return 'Por confirmar';

  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TZ,
  });
}

function emailName(email: string) {
  return String(email || '').split('@')[0]?.trim() || '';
}

function buildParticipantName(params: {
  userId: string;
  profileName?: string | null;
  metadataName?: string | null;
  email?: string | null;
}) {
  const profileName = normalizeText(params.profileName);
  if (profileName) return profileName;

  const metadataName = normalizeText(params.metadataName);
  if (metadataName) return metadataName;

  const fromEmail = emailName(normalizeText(params.email));
  if (fromEmail) return fromEmail;

  return params.userId;
}

function buildReminderSubject(eventTitle: string) {
  return `⚽ Recordatorio: ${eventTitle} empieza en 1 hora`;
}

function buildReminderBody(candidate: ReminderCandidate) {
  const greetingName = normalizeText(candidate.name) || 'pelotera';
  const eventDate = formatEventDate(candidate.eventStartTime);
  const eventTime = formatEventTime(candidate.eventStartTime);
  const eventLocation = normalizeText(candidate.eventLocation) || 'Por confirmar';

  return `Hola ${greetingName},

Tu evento ${candidate.eventTitle} empieza en 1 hora y tu pago ya fue aprobado, así que tu entrada está lista para el ingreso.

⚽ Fecha: ${eventDate}
⚽ Hora: ${eventTime}
⚽ Lugar: ${eventLocation}
⚽ Debes mostrar tu entrada a quien organiza el evento.

¡Queremos que la pases increíble y que te diviertas!

Equipo Peloteras
Más jugadoras, más fútbol`;
}

async function getAuthUsersByIds(userIds: string[]) {
  const adminSupabase = getAdminSupabase();
  const normalizedIds = Array.from(new Set(userIds.map((userId) => normalizeUserId(userId)).filter(Boolean)));
  const usersById = new Map<string, AuthUserLite>();

  if (!normalizedIds.length) return usersById;

  const missingIds = new Set(normalizedIds);
  let page = 1;
  const perPage = 200;

  while (missingIds.size > 0) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      log.error('Failed to list auth users for event ticket reminders', 'EVENT_REMINDERS', error, {
        page,
      });
      break;
    }

    const chunk = (data?.users ?? []) as AuthUserLite[];
    if (!chunk.length) break;

    chunk.forEach((authUser) => {
      const userId = normalizeUserId(authUser?.id);
      if (!userId || !missingIds.has(userId)) return;

      usersById.set(userId, authUser);
      missingIds.delete(userId);
    });

    if (chunk.length < perPage) break;
    page += 1;
  }

  return usersById;
}

async function reserveReminderDelivery(input: {
  eventId: number;
  assistantId: number;
  userId: string;
  email: string;
}) {
  const adminSupabase = getAdminSupabase();
  const nowIso = new Date().toISOString();

  try {
    const { data, error } = await adminSupabase
      .from(REMINDER_TABLE)
      .insert({
        event_id: input.eventId,
        assistant_id: input.assistantId,
        recipient_user_id: input.userId,
        recipient_email: input.email,
        reminder_type: REMINDER_TYPE,
        status: 'processing',
        sent_at: null,
        provider_message_id: null,
        error_message: null,
        last_attempt_at: nowIso,
        updated_at: nowIso,
      })
      .select('id')
      .single();

    if (!error && data?.id) {
      return Number(data.id);
    }

    if (error?.code !== '23505') {
      log.database('INSERT event ticket reminder delivery', REMINDER_TABLE, error as any, {
        eventId: input.eventId,
        assistantId: input.assistantId,
        userId: input.userId,
      });
      return null;
    }
  } catch (error) {
    log.error('Failed to reserve event ticket reminder delivery', 'EVENT_REMINDERS', error, {
      eventId: input.eventId,
      assistantId: input.assistantId,
      userId: input.userId,
    });
    return null;
  }

  const { data: existing, error: existingError } = await adminSupabase
    .from(REMINDER_TABLE)
    .select('id,status,updated_at')
    .eq('event_id', input.eventId)
    .eq('recipient_user_id', input.userId)
    .eq('reminder_type', REMINDER_TYPE)
    .maybeSingle();

  if (existingError || !existing) {
    log.database('SELECT event ticket reminder delivery', REMINDER_TABLE, existingError as any, {
      eventId: input.eventId,
      assistantId: input.assistantId,
      userId: input.userId,
    });
    return null;
  }

  const reminderRow = existing as ReminderDeliveryRow;
  const status = normalizeText(reminderRow.status).toLowerCase();
  const updatedAtMs = reminderRow.updated_at ? Date.parse(reminderRow.updated_at) : NaN;
  const isFreshProcessing =
    status === 'processing' &&
    Number.isFinite(updatedAtMs) &&
    Date.now() - updatedAtMs < PROCESSING_STALE_MS;

  if (status === 'sent' || isFreshProcessing) {
    return null;
  }

  const { data: updated, error: updateError } = await adminSupabase
    .from(REMINDER_TABLE)
    .update({
      assistant_id: input.assistantId,
      recipient_email: input.email,
      status: 'processing',
      sent_at: null,
      provider_message_id: null,
      error_message: null,
      last_attempt_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', reminderRow.id)
    .select('id')
    .single();

  if (updateError) {
    log.database('UPDATE event ticket reminder delivery to processing', REMINDER_TABLE, updateError as any, {
      reminderDeliveryId: reminderRow.id,
      eventId: input.eventId,
      assistantId: input.assistantId,
      userId: input.userId,
    });
    return null;
  }

  return Number(updated?.id || reminderRow.id);
}

async function markReminderDeliveryResult(input: {
  reminderDeliveryId: number;
  email: string;
  status: 'sent' | 'failed';
  providerMessageId?: string | null;
  errorMessage?: string | null;
}) {
  const adminSupabase = getAdminSupabase();
  const nowIso = new Date().toISOString();
  const payload = {
    recipient_email: input.email,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error_message: input.errorMessage ?? null,
    sent_at: input.status === 'sent' ? nowIso : null,
    updated_at: nowIso,
    last_attempt_at: nowIso,
  };

  const { error } = await adminSupabase
    .from(REMINDER_TABLE)
    .update(payload)
    .eq('id', input.reminderDeliveryId);

  if (error) {
    log.database('UPDATE event ticket reminder delivery result', REMINDER_TABLE, error as any, {
      reminderDeliveryId: input.reminderDeliveryId,
      status: input.status,
      email: input.email,
    });
  }
}

export async function sendEventTicketRemindersOneHourBefore(input: {
  baseUrl: string;
}): Promise<SendEventTicketReminderResult> {
  const adminSupabase = getAdminSupabase();
  const now = new Date();
  const windowStart = new Date(now.getTime() + WINDOW_START_MINUTES * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + WINDOW_END_MINUTES * 60 * 1000).toISOString();

  const { data: rawEvents, error: eventsError } = await adminSupabase
    .from('event')
    .select('id,title,start_time,location_text')
    .gte('start_time', windowStart)
    .lt('start_time', windowEnd)
    .order('start_time', { ascending: true });

  if (eventsError) {
    log.database('SELECT upcoming events for ticket reminders', 'event', eventsError as any, {
      windowStart,
      windowEnd,
    });
    throw new Error('No se pudieron cargar los eventos para los recordatorios.');
  }

  const events = ((rawEvents ?? []) as EventRow[]).filter(
    (event) => Number.isInteger(Number(event?.id)) && normalizeText(event?.start_time)
  );

  if (!events.length) {
    return {
      processedEventCount: 0,
      candidateCount: 0,
      reservedCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };
  }

  const eventIds = events.map((event) => Number(event.id));
  const eventById = new Map<number, EventRow>(events.map((event) => [Number(event.id), event]));

  const { data: rawAssistants, error: assistantsError } = await adminSupabase
    .from('assistants')
    .select('id,event,user,state')
    .eq('state', 'approved')
    .in('event', eventIds as any)
    .order('id', { ascending: false });

  if (assistantsError) {
    log.database('SELECT approved assistants for ticket reminders', 'assistants', assistantsError as any, {
      eventIds,
    });
    throw new Error('No se pudieron cargar las jugadoras aprobadas para los recordatorios.');
  }

  const assistants = (rawAssistants ?? []) as AssistantRow[];
  const latestAssistantByEventUser = new Map<string, AssistantRow>();
  assistants.forEach((assistant) => {
    const eventId = Number(assistant?.event);
    const userId = normalizeUserId(assistant?.user);
    if (!Number.isInteger(eventId) || !userId) return;

    const key = `${eventId}:${userId}`;
    if (!latestAssistantByEventUser.has(key)) {
      latestAssistantByEventUser.set(key, assistant);
    }
  });

  const userIds = Array.from(
    new Set(
      Array.from(latestAssistantByEventUser.values())
        .map((assistant) => normalizeUserId(assistant.user))
        .filter(Boolean)
    )
  );

  const [authUsersById, profilesRes] = await Promise.all([
    getAuthUsersByIds(userIds),
    adminSupabase.from('profile').select('user,username').in('user', userIds as any),
  ]);

  const profileByUserId = new Map<string, string>();
  if (profilesRes.error) {
    log.database('SELECT profiles for ticket reminders', 'profile', profilesRes.error as any, {
      userIds,
    });
  } else {
    ((profilesRes.data ?? []) as ProfileRow[]).forEach((profile) => {
      const userId = normalizeUserId(profile.user);
      const username = normalizeText(profile.username);
      if (userId && username) {
        profileByUserId.set(userId, username);
      }
    });
  }

  const candidates: ReminderCandidate[] = [];
  let skippedCount = 0;

  latestAssistantByEventUser.forEach((assistant) => {
    const eventId = Number(assistant.event);
    const userId = normalizeUserId(assistant.user);
    const event = eventById.get(eventId);
    const authUser = authUsersById.get(userId);
    const email = normalizeText(authUser?.email).toLowerCase();

    if (!event || !userId || !EMAIL_REGEX.test(email)) {
      skippedCount += 1;
      return;
    }

    candidates.push({
      assistantId: Number(assistant.id),
      eventId,
      userId,
      email,
      name: buildParticipantName({
        userId,
        profileName: profileByUserId.get(userId),
        metadataName: normalizeText(
          authUser?.user_metadata?.username || authUser?.user_metadata?.full_name
        ),
        email,
      }),
      eventTitle: normalizeText(event.title) || 'Tu evento en Peloteras',
      eventStartTime: normalizeText(event.start_time),
      eventLocation: normalizeText(event.location_text) || 'Por confirmar',
    });
  });

  const recipients: PersonalizedEventAnnouncementRecipientInput[] = [];
  let reservedCount = 0;
  let failedCount = 0;

  for (const candidate of candidates) {
    const reminderDeliveryId = await reserveReminderDelivery({
      eventId: candidate.eventId,
      assistantId: candidate.assistantId,
      userId: candidate.userId,
      email: candidate.email,
    });

    if (!reminderDeliveryId) {
      skippedCount += 1;
      continue;
    }

    reservedCount += 1;

    try {
      const ticketResult = await ensureTicketForAssistant(adminSupabase as any, candidate.assistantId);
      if (!ticketResult.ticket && ticketResult.reason === 'ticket_table_missing') {
        failedCount += 1;
        await markReminderDeliveryResult({
          reminderDeliveryId,
          email: candidate.email,
          status: 'failed',
          errorMessage: 'La tabla de entradas no está disponible para emitir la entrada.',
        });
        continue;
      }
    } catch (error) {
      failedCount += 1;
      await markReminderDeliveryResult({
        reminderDeliveryId,
        email: candidate.email,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'No se pudo preparar la entrada.',
      });
      continue;
    }

    recipients.push({
      trackingKey: String(reminderDeliveryId),
      email: candidate.email,
      subject: buildReminderSubject(candidate.eventTitle),
      body: buildReminderBody(candidate),
      ctaLabel: 'Ver mi entrada',
      ctaUrl: buildTicketUrl(input.baseUrl, candidate.userId),
    });
  }

  if (!recipients.length) {
    return {
      processedEventCount: events.length,
      candidateCount: candidates.length,
      reservedCount,
      sentCount: 0,
      failedCount,
      skippedCount,
    };
  }

  const sendResult = await sendPersonalizedEventAnnouncementEmails({
    recipients,
    baseUrl: input.baseUrl,
  });

  for (const result of sendResult.recipientResults) {
    const reminderDeliveryId = Number(result.trackingKey);
    if (!Number.isInteger(reminderDeliveryId) || reminderDeliveryId <= 0) continue;

    await markReminderDeliveryResult({
      reminderDeliveryId,
      email: result.email,
      status: result.status === 'queued' ? 'sent' : 'failed',
      providerMessageId: result.providerMessageId,
      errorMessage: result.errorMessage,
    });
  }

  log.info('Event ticket reminder cron completed', 'EVENT_REMINDERS', {
    windowStart,
    windowEnd,
    processedEventCount: events.length,
    candidateCount: candidates.length,
    reservedCount,
    sentCount: sendResult.sentCount,
    failedCount: failedCount + sendResult.failedCount,
    skippedCount,
  });

  return {
    processedEventCount: events.length,
    candidateCount: candidates.length,
    reservedCount,
    sentCount: sendResult.sentCount,
    failedCount: failedCount + sendResult.failedCount,
    skippedCount,
  };
}
