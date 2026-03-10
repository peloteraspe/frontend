'use server';

import { revalidatePath } from 'next/cache';
import { log } from '@core/lib/logger';
import { assertCanManageEvent } from '../services/eventPermissions.service';
import {
  getEventAnnouncementById,
  getFailedRecipientsForAnnouncement,
  recordEventAnnouncement,
} from '../services/eventAnnouncementHistory.service';
import { getParticipantContactsByEventId } from '../services/eventParticipants.service';
import { sendEventAnnouncementEmail } from '../services/eventAnnouncementEmail.service';

export type EventAnnouncementActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  sentCount: number;
  failedCount: number;
};

export const initialEventAnnouncementActionState: EventAnnouncementActionState = {
  status: 'idle',
  message: '',
  sentCount: 0,
  failedCount: 0,
};

function buildPath(eventId: string) {
  return `/admin/events/${eventId}/participants`;
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
    const email = String(recipient.email || '').trim().toLowerCase();
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

    const contacts = await getParticipantContactsByEventId(eventId, ['pending', 'approved']);
    const recipientContacts = contacts.filter((contact) => contact.email && contact.email !== 'Sin correo');
    const recipients = recipientContacts.map((contact) => contact.email);

    if (!recipients.length) {
      return {
        status: 'error',
        message: 'No hay inscritas con correo para este evento.',
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
