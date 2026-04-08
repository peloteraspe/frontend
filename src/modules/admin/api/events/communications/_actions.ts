'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { getAllUserEmailsForBroadcast } from '@modules/admin/api/users/services/adminUsers.service';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { assertCanManageEvent } from '../services/eventPermissions.service';
import {
  getEventAnnouncementById,
  getFailedRecipientsForAnnouncement,
  recordEventAnnouncement,
} from '../services/eventAnnouncementHistory.service';
import { getApprovedParticipantsByEventId } from '../services/eventParticipants.service';
import { sendEventAnnouncementEmail } from '../services/eventAnnouncementEmail.service';
import { retryResendHistoricalEmail } from '../services/resendSentEmailHistory.service';

export type EventAnnouncementActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  sentCount: number;
  failedCount: number;
};

type EventPromotionRow = {
  id: string | number;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  location_text: string | null;
  district: string | null;
  price: number | string | null;
  description: unknown;
  is_published: boolean | null;
  created_by: string | null;
  created_by_id: string | null;
};

const DEFAULT_TIMEZONE = 'America/Lima';

function buildPath(eventId: string) {
  return `/admin/events/${eventId}/participants`;
}

function buildGlobalCommunicationsPath() {
  return '/admin/communications';
}

async function assertSuperAdminAccess() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para gestionar correos.');
  }

  if (!isSuperAdmin(user as any)) {
    throw new Error('Solo superadmin puede gestionar envíos globales de correo.');
  }

  return { supabase, user };
}

function buildRecipientMetadata(
  recipients: Array<{
    email: string;
    userId?: string | null;
    name?: string | null;
    state?: string | null;
  }>
) {
  const detailsByEmail = new Map<
    string,
    {
      userId: string | null;
      name: string | null;
      state: string | null;
    }
  >();

  recipients.forEach((recipient) => {
    const email = String(recipient.email || '')
      .trim()
      .toLowerCase();
    if (!email || detailsByEmail.has(email)) return;

    detailsByEmail.set(email, {
      userId: recipient.userId ?? null,
      name: recipient.name ?? null,
      state: recipient.state ?? null,
    });
  });

  return detailsByEmail;
}

function appendPersistenceWarning(message: string, persistenceError: string | null) {
  if (!persistenceError) return message;
  return `${message} No se pudo guardar el historial del envío.`;
}

function buildInvisibleThreadBreaker() {
  const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return Array.from(seed)
    .map((char, index) => {
      const code = char.charCodeAt(0) + index;
      if (code % 3 === 0) return '\u200B';
      if (code % 3 === 1) return '\u200C';
      return '\u2060';
    })
    .join('');
}

function parseDate(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameCalendarDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatPromotionDateRange(startRaw: unknown, endRaw: unknown) {
  const start = parseDate(startRaw);
  if (!start) return 'Por confirmar';

  const end = parseDate(endRaw);
  const formatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
  });

  if (!end || isSameCalendarDate(start, end)) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatPromotionTimeRange(startRaw: unknown, endRaw: unknown) {
  const start = parseDate(startRaw);
  if (!start) return 'Por confirmar';

  const end = parseDate(endRaw);
  const timeFormatter = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  });
  const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  });

  if (!end) {
    return `${timeFormatter.format(start)} - --:--`;
  }

  if (isSameCalendarDate(start, end)) {
    return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  }

  return `${dateTimeFormatter.format(start)} - ${dateTimeFormatter.format(end)}`;
}

function extractEventDescription(value: unknown) {
  if (value && typeof value === 'object') {
    const maybe = value as { description?: string | null };
    return String(maybe.description || '').trim();
  }

  return String(value || '').trim();
}

function formatPromotionPrice(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Gratis';

  const hasDecimals = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildEventPromotionTemplate(event: EventPromotionRow) {
  const eventTitle = String(event.title || 'Evento Peloteras').trim() || 'Evento Peloteras';
  const description = extractEventDescription(event.description);
  const locationLabel = String(event.location_text || '').trim() || 'Ubicación por confirmar';
  const districtLabel = String(event.district || '').trim();
  const extraDetails = [
    { label: 'Precio', value: formatPromotionPrice(event.price) },
    ...(districtLabel ? [{ label: 'Distrito', value: districtLabel }] : []),
  ];

  return {
    subject: `⚽ Nuevo evento en Peloteras: ${eventTitle}`,
    intro:
      'Hay un nuevo evento en Peloteras y queríamos compartirlo contigo. Mira los detalles y súmate a la cancha.',
    eventTitle,
    eventDate: formatPromotionDateRange(event.start_time, event.end_time),
    eventTime: formatPromotionTimeRange(event.start_time, event.end_time),
    eventLocation: locationLabel,
    details: extraDetails,
    description,
  };
}

async function getEventOrganizerEmail(userId: string | null | undefined) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return '';

  try {
    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase.auth.admin.getUserById(normalizedUserId);
    if (error) {
      log.warn('Could not load event organizer email for promotion email', 'ADMIN_EVENTS', {
        userId: normalizedUserId,
        reason: error.message,
      });
      return '';
    }

    return String(data?.user?.email || '').trim();
  } catch (error) {
    log.warn('Event organizer email lookup failed for promotion email', 'ADMIN_EVENTS', {
      userId: normalizedUserId,
      reason: error instanceof Error ? error.message : String(error || ''),
    });
    return '';
  }
}

export async function sendEventAnnouncement(
  _previousState: EventAnnouncementActionState,
  formData: FormData
): Promise<EventAnnouncementActionState> {
  try {
    const eventId = String(formData.get('eventId') || '').trim();
    const subject = String(formData.get('subject') || '').trim();
    const body = String(formData.get('body') || '').trim();

    if (!eventId) {
      return {
        status: 'error',
        message: 'Falta el evento a comunicar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    if (!subject) {
      return {
        status: 'error',
        message: 'Ingresa un asunto antes de enviar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    if (!body) {
      return {
        status: 'error',
        message: 'Ingresa el contenido del correo antes de enviar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const { supabase, user } = await assertCanManageEvent(eventId);

    const { data: event, error: eventError } = await supabase
      .from('event')
      .select('title')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      throw new Error(eventError.message);
    }

    const contacts = await getApprovedParticipantsByEventId(eventId);
    const recipientContacts = contacts.filter(
      (contact) => contact.email && contact.email !== 'Sin correo'
    );
    const recipients = recipientContacts.map((contact) => contact.email);

    if (!recipients.length) {
      return {
        status: 'error',
        message: 'No hay inscritas con pago aprobado y correo para este evento.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const result = await sendEventAnnouncementEmail({
      subject,
      body,
      recipients,
    });

    const recipientMetadata = buildRecipientMetadata(
      recipientContacts.map((contact) => ({
        email: contact.email,
        userId: contact.userId,
        name: contact.name,
        state: contact.state,
      }))
    );

    const persistence = await recordEventAnnouncement({
      eventId,
      createdByUserId: String(user.id || '') || null,
      subject,
      body,
      totalRecipients: recipientMetadata.size,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      recipientResults: result.recipientResults.map((recipient) => {
        const metadata = recipientMetadata.get(recipient.email);
        return {
          email: recipient.email,
          userId: metadata?.userId ?? null,
          name: metadata?.name ?? null,
          participantState: metadata?.state ?? null,
          status: recipient.status,
          providerMessageId: recipient.providerMessageId,
          errorMessage: recipient.errorMessage,
        };
      }),
    });

    revalidatePath(buildPath(eventId));
    revalidatePath(buildGlobalCommunicationsPath());

    if (result.sentCount === 0 && result.failedCount > 0) {
      return {
        status: 'error',
        message: appendPersistenceWarning(
          `No se pudo enviar el correo para ${String(event?.title || 'el evento')}. Fallaron ${result.failedCount} envíos.`,
          persistence.errorMessage
        ),
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      };
    }

    return {
      status: 'success',
      message:
        result.failedCount > 0
          ? appendPersistenceWarning(
              `Correo enviado parcialmente para ${String(event?.title || 'el evento')}. Salieron ${result.sentCount} y fallaron ${result.failedCount}.`,
              persistence.errorMessage
            )
          : appendPersistenceWarning(
              `Correo enviado correctamente para ${String(event?.title || 'el evento')}.`,
              persistence.errorMessage
            ),
      sentCount: result.sentCount,
      failedCount: result.failedCount,
    };
  } catch (error) {
    log.error('Failed to send event announcement', 'ADMIN_EVENTS', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo enviar el correo del evento.',
      sentCount: 0,
      failedCount: 0,
    };
  }
}

export async function sendEventPromotionToAllPlayers(
  _previousState: EventAnnouncementActionState,
  formData: FormData
): Promise<EventAnnouncementActionState> {
  try {
    const eventId = String(formData.get('eventId') || '').trim();

    if (!eventId) {
      return {
        status: 'error',
        message: 'Falta el evento a promocionar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const { supabase } = await assertSuperAdminAccess();
    const { data: event, error: eventError } = await supabase
      .from('event')
      .select(
        'id, title, start_time, end_time, location_text, district, price, description, is_published, created_by, created_by_id'
      )
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      throw new Error(eventError.message);
    }

    if (!event) {
      return {
        status: 'error',
        message: 'El evento seleccionado ya no existe.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    if (!event.is_published) {
      return {
        status: 'error',
        message: 'Publica el evento antes de enviar el correo de promoción.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const recipients = await getAllUserEmailsForBroadcast();
    if (!recipients.length) {
      return {
        status: 'error',
        message: 'No hay jugadoras con correo válido para enviar esta promoción.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const template = buildEventPromotionTemplate(event as EventPromotionRow);
    const threadBreaker = buildInvisibleThreadBreaker();
    const organizerEmail =
      (await getEventOrganizerEmail(event.created_by_id)) || 'contacto@peloteras.com';
    const organizerName = String(event.created_by || '').trim() || 'Equipo Peloteras';
    const result = await sendEventAnnouncementEmail({
      subject: `${template.subject}${threadBreaker}`,
      body: `${template.intro}${threadBreaker}`,
      recipients,
      ctaLabel: 'Ver evento',
      ctaUrl: `/events/${eventId}`,
      eventPromotionLayout: {
        eventTitle: template.eventTitle,
        intro: `${template.intro}${threadBreaker}`,
        eventDate: template.eventDate,
        eventTime: template.eventTime,
        eventLocation: template.eventLocation,
        registrationCtaLabel: 'Inscríbete',
        registrationCtaUrl: `/payments/${eventId}`,
        organizerName,
        organizerEmail,
        details: template.details,
        description: template.description,
      },
    });

    revalidatePath('/admin/events');

    if (result.sentCount === 0 && result.failedCount > 0) {
      return {
        status: 'error',
        message: `No se pudo enviar la promoción de ${String(event.title || 'este evento')}. Fallaron ${result.failedCount} envíos.`,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      };
    }

    return {
      status: 'success',
      message:
        result.failedCount > 0
          ? `Promoción enviada parcialmente para ${String(event.title || 'el evento')}. Salieron ${result.sentCount} y fallaron ${result.failedCount}.`
          : `Promoción enviada correctamente para ${String(event.title || 'el evento')}.`,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
    };
  } catch (error) {
    log.error('Failed to send event promotion to all players', 'ADMIN_EVENTS', error);
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'No se pudo enviar la promoción del evento.',
      sentCount: 0,
      failedCount: 0,
    };
  }
}

export async function resendFailedEventAnnouncement(
  _previousState: EventAnnouncementActionState,
  formData: FormData
): Promise<EventAnnouncementActionState> {
  try {
    const announcementId = Number(formData.get('announcementId'));
    if (!Number.isInteger(announcementId) || announcementId <= 0) {
      return {
        status: 'error',
        message: 'No se pudo identificar el envío a reintentar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const announcement = await getEventAnnouncementById(announcementId);
    if (!announcement) {
      return {
        status: 'error',
        message: 'El envío seleccionado ya no existe.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const eventId = String(announcement.event_id || '').trim();
    const { user } = await assertCanManageEvent(eventId);
    const failedRecipients = await getFailedRecipientsForAnnouncement(announcementId);

    if (!failedRecipients.length) {
      return {
        status: 'error',
        message: 'Ese envío ya no tiene destinatarias fallidas para reenviar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const result = await sendEventAnnouncementEmail({
      subject: String(announcement.subject || '').trim(),
      body: String(announcement.body || '').trim(),
      recipients: failedRecipients.map((recipient) => recipient.email),
    });

    const recipientMetadata = buildRecipientMetadata(
      failedRecipients.map((recipient) => ({
        email: recipient.email,
        userId: recipient.userId,
        name: recipient.name,
        state: recipient.participantState,
      }))
    );

    const persistence = await recordEventAnnouncement({
      eventId,
      createdByUserId: String(user.id || '') || null,
      subject: String(announcement.subject || '').trim(),
      body: String(announcement.body || '').trim(),
      totalRecipients: recipientMetadata.size,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      sourceAnnouncementId: announcementId,
      recipientResults: result.recipientResults.map((recipient) => {
        const metadata = recipientMetadata.get(recipient.email);
        return {
          email: recipient.email,
          userId: metadata?.userId ?? null,
          name: metadata?.name ?? null,
          participantState: metadata?.state ?? null,
          status: recipient.status,
          providerMessageId: recipient.providerMessageId,
          errorMessage: recipient.errorMessage,
        };
      }),
    });

    revalidatePath(buildPath(eventId));
    revalidatePath(buildGlobalCommunicationsPath());

    if (result.sentCount === 0 && result.failedCount > 0) {
      return {
        status: 'error',
        message: appendPersistenceWarning(
          `No se pudo reenviar el lote fallido. Fallaron ${result.failedCount} correos.`,
          persistence.errorMessage
        ),
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      };
    }

    return {
      status: 'success',
      message:
        result.failedCount > 0
          ? appendPersistenceWarning(
              `Reenvío parcial completado. Salieron ${result.sentCount} y fallaron ${result.failedCount}.`,
              persistence.errorMessage
            )
          : appendPersistenceWarning(
              `Reenvío completado correctamente para ${result.sentCount} correos.`,
              persistence.errorMessage
            ),
      sentCount: result.sentCount,
      failedCount: result.failedCount,
    };
  } catch (error) {
    log.error('Failed to resend failed event announcement emails', 'ADMIN_EVENTS', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo reenviar el lote fallido.',
      sentCount: 0,
      failedCount: 0,
    };
  }
}

export async function resendHistoricalBouncedEmail(
  _previousState: EventAnnouncementActionState,
  formData: FormData
): Promise<EventAnnouncementActionState> {
  try {
    await assertSuperAdminAccess();

    const emailId = String(formData.get('emailId') || '').trim();
    if (!emailId) {
      return {
        status: 'error',
        message: 'No se pudo identificar el correo histórico a reenviar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const result = await retryResendHistoricalEmail(emailId);
    revalidatePath(buildGlobalCommunicationsPath());

    return {
      status: 'success',
      message: 'Correo rebotado reenviado correctamente.',
      sentCount: result.sentCount,
      failedCount: result.failedCount,
    };
  } catch (error) {
    log.error('Failed to resend bounced historical email', 'ADMIN_EVENTS', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo reenviar el correo rebotado.',
      sentCount: 0,
      failedCount: 0,
    };
  }
}
