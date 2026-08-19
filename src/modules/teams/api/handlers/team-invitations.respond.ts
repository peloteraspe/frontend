import { jsonNoStore } from '@core/api/responses';
import { rateLimitByRequest } from '@core/api/rateLimit';
import { getServerSupabase } from '@core/api/supabase.server';
import { respondToTeamInvitation } from '@modules/teams/api/services/teams.service';

type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_team_invitation_response_post',
    limit: 30,
    windowMs: 60_000,
    message: 'Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.',
  });
  if (limited) return limited;

  const invitationId = Number((await context.params).invitationId);
  if (!Number.isSafeInteger(invitationId) || invitationId <= 0) {
    return jsonNoStore({ error: 'Convocatoria inválida.' }, 400);
  }

  const body = (await request.json().catch(() => null)) as { response?: unknown } | null;
  const response = String(body?.response || '').trim().toLowerCase();
  if (response !== 'accepted' && response !== 'rejected') {
    return jsonNoStore({ error: 'Respuesta inválida.' }, 400);
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonNoStore({ error: 'Authentication required' }, 401);

  try {
    const invitation = await respondToTeamInvitation(invitationId, response);
    if (invitation.status === 'expired') {
      return jsonNoStore(
        { status: 'expired', error: 'La convocatoria ya venció.' },
        409
      );
    }

    const eventName =
      response === 'accepted' ? 'team_invitation_accepted' : 'team_invitation_rejected';
    const { error: analyticsError } = await supabase
      .from('product_analytics_events')
      .insert({
        event_name: eventName,
        user_id: user.id,
        source: 'convocatorias',
        channel: 'team_invitation',
        payload: {
          team_id: invitation.team_id,
          invitation_id: invitation.id,
        },
      });
    if (analyticsError) {
      console.warn('Team invitation response analytics failed:', analyticsError.code);
    }

    return jsonNoStore({
      invitation: {
        id: invitation.id,
        teamId: invitation.team_id,
        status: invitation.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const status = message.includes('not found') ? 404 : 409;
    return jsonNoStore(
      {
        error:
          status === 404
            ? 'No encontramos esta convocatoria.'
            : 'La convocatoria ya no se puede responder.',
      },
      status
    );
  }
}
