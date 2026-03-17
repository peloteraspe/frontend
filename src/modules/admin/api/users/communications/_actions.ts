'use server';

import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { sendEventAnnouncementEmail } from '@modules/admin/api/events/services/eventAnnouncementEmail.service';
import { getUserEmailsForBroadcastByIds } from '../services/adminUsers.service';

export type UsersBroadcastActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  sentCount: number;
  failedCount: number;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseManualEmails(rawValue: unknown) {
  const tokens = String(rawValue || '')
    .split(/[\s,;]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  const valid = new Set<string>();
  const invalid = new Set<string>();

  tokens.forEach((token) => {
    if (isValidEmail(token)) {
      valid.add(token);
      return;
    }

    invalid.add(token);
  });

  return {
    valid: Array.from(valid),
    invalid: Array.from(invalid),
  };
}

async function assertSuperAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para enviar correos.');
  }

  if (!isSuperAdmin(user as any)) {
    throw new Error('Solo superadmin puede enviar correos a usuarias seleccionadas.');
  }
}

export async function sendUsersBroadcast(
  _previousState: UsersBroadcastActionState,
  formData: FormData
): Promise<UsersBroadcastActionState> {
  try {
    await assertSuperAdmin();

    const selectedUserIds = Array.from(
      new Set(
        formData
          .getAll('userIds')
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      )
    );
    const subject = String(formData.get('subject') || '').trim();
    const body = String(formData.get('body') || '').trim();
    const bodyHtml = String(formData.get('bodyHtml') || '').trim();
    const manualRecipients = parseManualEmails(formData.get('manualEmails'));

    if (!selectedUserIds.length && !manualRecipients.valid.length) {
      return {
        status: 'error',
        message: 'Selecciona al menos una usuaria o agrega un correo manual antes de enviar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    if (manualRecipients.invalid.length > 0) {
      return {
        status: 'error',
        message: 'Revisa los correos manuales inválidos antes de enviar.',
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

    if (!body && !bodyHtml) {
      return {
        status: 'error',
        message: 'Ingresa el contenido del correo antes de enviar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const selectedRecipients = selectedUserIds.length ? await getUserEmailsForBroadcastByIds(selectedUserIds) : [];
    const recipients = Array.from(new Set([...selectedRecipients, ...manualRecipients.valid].filter(Boolean)));
    if (!recipients.length) {
      return {
        status: 'error',
        message: 'No hay destinatarias con correo válido para enviar.',
        sentCount: 0,
        failedCount: 0,
      };
    }

    const result = await sendEventAnnouncementEmail({
      subject,
      body,
      bodyHtml,
      recipients,
    });

    return {
      status: 'success',
      message:
        result.failedCount > 0
          ? `Correo enviado parcialmente. Salieron ${result.sentCount} y fallaron ${result.failedCount}.`
          : 'Correo enviado correctamente.',
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
