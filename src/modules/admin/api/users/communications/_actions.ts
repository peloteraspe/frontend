'use server';

import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { sendEventAnnouncementEmail } from '@modules/admin/api/events/services/eventAnnouncementEmail.service';
import { getAllUserEmailsForBroadcast } from '../services/adminUsers.service';

export type UsersBroadcastActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  sentCount: number;
  failedCount: number;
};

async function assertSuperAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para enviar correos.');
  }

  if (!isSuperAdmin(user as any)) {
    throw new Error('Solo superadmin puede enviar correos a todas las usuarias.');
  }
}

export async function sendUsersBroadcast(
  _previousState: UsersBroadcastActionState,
  formData: FormData
): Promise<UsersBroadcastActionState> {
  try {
    await assertSuperAdmin();

    const subject = String(formData.get('subject') || '').trim();
    const body = String(formData.get('body') || '').trim();

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

    const recipients = await getAllUserEmailsForBroadcast();
    if (!recipients.length) {
      return {
        status: 'error',
        message: 'No hay usuarias con correo válido para enviar.',
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
          ? `Correo enviado parcialmente. Salieron ${result.sentCount} y fallaron ${result.failedCount}.`
          : 'Correo enviado correctamente a las usuarias.',
      sentCount: result.sentCount,
      failedCount: result.failedCount,
    };
  } catch (error) {
    log.error('Failed to send users broadcast email', 'ADMIN_USERS', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No se pudo enviar el correo.',
      sentCount: 0,
      failedCount: 0,
    };
  }
}
