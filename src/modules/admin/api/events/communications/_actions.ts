'use server';

import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
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

async function assertCanManageEvent(eventId: string) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para gestionar este evento.');
  }

  if (isSuperAdmin(user as any)) {
    return { supabase, user };
  }

  const { data: event, error } = await supabase
    .from('event')
    .select('created_by_id')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!event) throw new Error('Evento no encontrado.');
  if (String(event.created_by_id || '') !== String(user.id || '')) {
    throw new Error('No tienes permisos para comunicar este evento.');
  }

  return { supabase, user };
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

    const { supabase } = await assertCanManageEvent(eventId);

    const { data: event, error: eventError } = await supabase
      .from('event')
      .select('title')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      throw new Error(eventError.message);
    }

    const contacts = await getParticipantContactsByEventId(eventId, ['pending', 'approved']);
    const recipients = contacts
      .map((contact) => contact.email)
      .filter((email) => email && email !== 'Sin correo');

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

    return {
      status: 'success',
      message:
        result.failedCount > 0
          ? `Correo enviado parcialmente para ${String(event?.title || 'el evento')}. Salieron ${result.sentCount} y fallaron ${result.failedCount}.`
          : `Correo enviado correctamente para ${String(event?.title || 'el evento')}.`,
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
