import { jsonNoStore } from '@core/api/responses';
import { rateLimitByRequest } from '@core/api/rateLimit';
import { getServerSupabase } from '@core/api/supabase.server';
import { cancelTeamInvitation } from '@modules/teams/api/services/teams.service';

type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_team_invitation_cancel_post',
    limit: 30,
    windowMs: 60_000,
    message: 'Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.',
  });
  if (limited) return limited;

  const invitationId = Number((await context.params).invitationId);
  if (!Number.isSafeInteger(invitationId) || invitationId <= 0) {
    return jsonNoStore({ error: 'Convocatoria inválida.' }, 400);
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonNoStore({ error: 'Authentication required' }, 401);

  try {
    const invitation = await cancelTeamInvitation(invitationId);
    const { error: analyticsError } = await supabase
      .from('product_analytics_events')
      .insert({
        event_name: 'team_invitation_cancelled',
        user_id: user.id,
        ref_user_id: invitation.invitee_user_id,
        source: 'team_profile',
        channel: 'team_invitation',
        payload: { team_id: invitation.team_id, invitation_id: invitation.id },
      });
    if (analyticsError) {
      console.warn('Team invitation cancellation analytics failed:', analyticsError.code);
    }

    return jsonNoStore({ invitation: { id: invitation.id, status: invitation.status } });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return jsonNoStore(
      {
        error: message.includes('not found')
          ? 'No encontramos esta convocatoria.'
          : 'La convocatoria ya no se puede cancelar.',
      },
      message.includes('not found') ? 404 : 409
    );
  }
}
