import { NextResponse } from 'next/server';
import { jsonNoStore } from '@core/api/responses';
import { rateLimitByRequest } from '@core/api/rateLimit';
import { getServerSupabase } from '@core/api/supabase.server';
import { createTeamInvitation } from '@modules/teams/api/services/teams.service';
import { sendTeamInvitationEmail } from '@modules/teams/api/services/teamInvitationEmail.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RouteContext = {
  params: Promise<{ teamRef: string }>;
};

type CreateInvitationBody = {
  candidateUserId?: unknown;
  email?: unknown;
};

function invitationErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('active team captain')) return 403;
  if (message.includes('duplicate key') || message.includes('already exists')) return 409;
  if (message.includes('active team member')) return 409;
  if (message.includes('not available')) return 404;
  return 500;
}

async function recordInvitationEvent(input: {
  eventName: string;
  userId: string;
  candidateUserId: string | null;
  teamId: number;
  invitationId: number;
  emailDeliveryStatus: string;
}) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from('product_analytics_events').insert({
    event_name: input.eventName,
    user_id: input.userId,
    ref_user_id: input.candidateUserId,
    source: 'team_profile',
    channel: 'team_invitation',
    payload: {
      team_id: input.teamId,
      invitation_id: input.invitationId,
      email_delivery_status: input.emailDeliveryStatus,
      target_kind: input.candidateUserId ? 'player' : 'external_email',
    },
  });

  if (error) {
    console.warn('Team invitation analytics insert failed:', error.code);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_team_invitations_post',
    limit: 20,
    windowMs: 60_000,
    message: 'Demasiadas convocatorias. Espera un momento e inténtalo nuevamente.',
  });
  if (limited) return limited;

  const { teamRef: rawTeamId } = await context.params;
  const teamId = Number(rawTeamId);
  if (!Number.isSafeInteger(teamId) || teamId <= 0) {
    return jsonNoStore({ error: 'Equipo inválido.' }, 400);
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonNoStore({ error: 'Authentication required' }, 401);

  const body = (await request.json().catch(() => null)) as CreateInvitationBody | null;
  const candidateUserId = String(body?.candidateUserId || '').trim();
  const inviteeEmail = String(body?.email || '').trim().toLowerCase();
  const hasCandidate = UUID_PATTERN.test(candidateUserId);
  const hasEmail = inviteeEmail.length <= 254 && EMAIL_PATTERN.test(inviteeEmail);
  if (hasCandidate === hasEmail) {
    return jsonNoStore(
      { error: 'Selecciona una jugadora o ingresa un email válido.' },
      400
    );
  }

  try {
    const invitation = await createTeamInvitation({
      teamId,
      deliveryMethod: hasCandidate ? 'username' : 'email',
      inviteeUserId: hasCandidate ? candidateUserId : null,
      inviteeEmail: hasEmail ? inviteeEmail : null,
    });
    const delivery = await sendTeamInvitationEmail(invitation);
    const eventName = delivery.sent
      ? 'team_invitation_sent'
      : 'team_invitation_send_failed';

    await recordInvitationEvent({
      eventName,
      userId: user.id,
      candidateUserId: invitation.invitee_user_id,
      teamId,
      invitationId: invitation.id,
      emailDeliveryStatus: delivery.sent ? 'sent' : 'failed',
    });

    return jsonNoStore(
      {
        invitation: {
          id: invitation.id,
          teamId: invitation.team_id,
          username: invitation.invitee_username,
          email: invitation.invitee_email,
          status: invitation.status,
          expiresAt: invitation.expires_at,
          emailDeliveryStatus: delivery.sent ? 'sent' : 'failed',
        },
        warning: delivery.sent
          ? null
          : 'La convocatoria fue creada, pero no pudimos enviar el correo.',
      },
      201
    );
  } catch (error) {
    const status = invitationErrorStatus(error);
    const message =
      status === 403
        ? 'No tienes permisos para convocar jugadoras en este equipo.'
        : status === 409
          ? 'La jugadora ya pertenece al equipo o tiene una convocatoria pendiente.'
          : status === 404
            ? 'La destinataria ya no está disponible para recibir esta convocatoria.'
            : 'No se pudo crear la convocatoria.';

    if (status === 500) console.error('POST team invitation failed:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
