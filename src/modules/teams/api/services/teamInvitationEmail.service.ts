import 'server-only';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import { resolveAppOrigin } from '@modules/auth/lib/redirect';
import type { TeamInvitationRow } from '@modules/teams/model/types';

type DeliveryResult =
  | { sent: true; providerMessageId: string | null }
  | { sent: false; reason: 'missing_recipient' | 'not_configured' | 'provider_error' | 'request_failed' };

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getInvitationUrl(token: string) {
  const origin = new URL(resolveAppOrigin());
  if (process.env.NODE_ENV === 'production') origin.protocol = 'https:';
  return new URL(`/convocatorias/${encodeURIComponent(token)}`, origin).toString();
}

function formatExpiration(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'en 14 días';

  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(date);
}

function buildHtml(input: {
  inviteeName: string;
  captainName: string;
  teamName: string;
  teamAvatarUrl: string | null;
  invitationUrl: string;
  expiration: string;
  requiresAccount: boolean;
}) {
  const inviteeName = escapeHtml(input.inviteeName);
  const captainName = escapeHtml(input.captainName);
  const teamName = escapeHtml(input.teamName);
  const invitationUrl = escapeHtml(input.invitationUrl);
  const expiration = escapeHtml(input.expiration);
  const avatar = input.teamAvatarUrl
    ? `<img src="${escapeHtml(input.teamAvatarUrl)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border-radius:18px;object-fit:cover;margin:0 auto 20px;">`
    : '';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f7f2f8;font-family:Arial,sans-serif;color:#172033;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f2f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;">
        <tr><td style="height:10px;background:#54086f;"></td></tr>
        <tr><td style="padding:36px 28px;text-align:center;">
          ${avatar}
          <p style="margin:0 0 10px;font-size:14px;color:#6b7280;">Hola ${inviteeName},</p>
          <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;color:#280332;">${captainName} te convocó a ${teamName}</h1>
          <p style="margin:0 auto 26px;max-width:430px;font-size:16px;line-height:1.6;color:#4b5563;">${input.requiresAccount ? 'Crea tu cuenta de Peloteras con este mismo correo para revisar el equipo y responder la convocatoria.' : 'Revisa el perfil del equipo y acepta o rechaza la convocatoria desde tu cuenta de Peloteras.'}</p>
          <a href="${invitationUrl}" style="display:inline-block;background:#54086f;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:12px;">Ver convocatoria</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">La convocatoria vence el ${expiration}. Necesitas iniciar sesión en Peloteras para responder.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(input: {
  inviteeName: string;
  captainName: string;
  teamName: string;
  invitationUrl: string;
  expiration: string;
  requiresAccount: boolean;
}) {
  return [
    `Hola ${input.inviteeName},`,
    '',
    `${input.captainName} te convocó a ${input.teamName}.`,
    input.requiresAccount
      ? 'Crea tu cuenta de Peloteras con este mismo correo y responde la convocatoria:'
      : 'Revisa el equipo y responde la convocatoria desde tu cuenta de Peloteras:',
    input.invitationUrl,
    '',
    `La convocatoria vence el ${input.expiration}.`,
  ].join('\n');
}

async function updateDelivery(
  invitationId: number,
  result: DeliveryResult
) {
  const admin = getAdminSupabase();
  const values = result.sent
    ? {
        email_delivery_status: 'sent',
        email_sent_at: new Date().toISOString(),
        provider_message_id: result.providerMessageId,
      }
    : {
        email_delivery_status: 'failed',
        email_sent_at: null,
        provider_message_id: null,
      };

  const { error } = await admin
    .from('team_invitation')
    .update(values)
    .eq('id', invitationId);

  if (error) {
    log.warn('Could not update team invitation email delivery', 'TEAM_INVITATION', {
      invitationId,
      code: error.code,
    });
  }
}

export async function sendTeamInvitationEmail(
  invitation: TeamInvitationRow
): Promise<DeliveryResult> {
  const admin = getAdminSupabase();
  const { data: currentDelivery } = await admin
    .from('team_invitation')
    .select('email_delivery_status, provider_message_id')
    .eq('id', invitation.id)
    .maybeSingle();

  if (currentDelivery?.email_delivery_status === 'sent') {
    return {
      sent: true,
      providerMessageId: currentDelivery.provider_message_id ?? null,
    };
  }

  if (!invitation.invitee_email) {
    const result = { sent: false as const, reason: 'missing_recipient' as const };
    await updateDelivery(invitation.id, result);
    return result;
  }

  const [{ data: team }, { data: captainProfile }] = await Promise.all([
    admin
      .from('team')
      .select('name, avatar_url')
      .eq('id', invitation.team_id)
      .maybeSingle(),
    admin
      .from('profile')
      .select('username')
      .eq('user', invitation.invited_by_user_id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const teamName = String(team?.name || 'un equipo de Peloteras').trim();
  const captainName = captainProfile?.username ? `@${captainProfile.username}` : 'Una capitana';
  const inviteeName = invitation.invitee_username
    ? `@${invitation.invitee_username}`
    : 'pelotera';
  const invitationUrl = getInvitationUrl(invitation.invitation_token);
  const expiration = formatExpiration(invitation.expires_at);
  const subject = `${teamName} te convocó a su equipo`;
  const html = buildHtml({
    inviteeName,
    captainName,
    teamName,
    teamAvatarUrl: team?.avatar_url ?? null,
    invitationUrl,
    expiration,
    requiresAccount: !invitation.invitee_user_id,
  });
  const text = buildText({
    inviteeName,
    captainName,
    teamName,
    invitationUrl,
    expiration,
    requiresAccount: !invitation.invitee_user_id,
  });
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.EMAIL_FROM || process.env.RESEND_FROM || '').trim();

  if (!apiKey || !from) {
    const result = { sent: false as const, reason: 'not_configured' as const };
    await updateDelivery(invitation.id, result);
    return result;
  }

  let result: DeliveryResult;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `team-invitation-${invitation.id}`,
      },
      body: JSON.stringify({
        from,
        to: [invitation.invitee_email],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      result = { sent: false, reason: 'provider_error' };
    } else {
      const payload = (await response.json().catch(() => ({}))) as { id?: string };
      result = { sent: true, providerMessageId: payload.id ?? null };
    }
  } catch (error) {
    log.error('Team invitation email request failed', 'TEAM_INVITATION', error, {
      invitationId: invitation.id,
    });
    result = { sent: false, reason: 'request_failed' };
  }

  await updateDelivery(invitation.id, result);
  return result;
}
