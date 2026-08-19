import { jsonNoStore } from '@core/api/responses';
import { rateLimitByRequest } from '@core/api/rateLimit';
import { getServerSupabase } from '@core/api/supabase.server';
import { resolveAppOrigin } from '@modules/auth/lib/redirect';

type RouteContext = {
  params: Promise<{ teamRef: string }>;
};

function buildLink(token: string, request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = new URL(resolveAppOrigin(requestOrigin));
  if (process.env.NODE_ENV === 'production') origin.protocol = 'https:';
  return new URL(`/teams/invite/${encodeURIComponent(token)}`, origin).toString();
}

function parseTeamId(value: string) {
  const teamId = Number(value);
  return Number.isSafeInteger(teamId) && teamId > 0 ? teamId : null;
}

export async function GET(request: Request, context: RouteContext) {
  const teamId = parseTeamId((await context.params).teamRef);
  if (!teamId) return jsonNoStore({ error: 'Equipo inválido.' }, 400);

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonNoStore({ error: 'Authentication required' }, 401);

  const { data, error } = await supabase.rpc('get_team_general_invitation_token', {
    p_team_id: teamId,
  });
  if (error || !data) return jsonNoStore({ error: 'Equipo no encontrado.' }, 404);

  return jsonNoStore({ link: buildLink(String(data), request) });
}

export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_team_invitation_link_regenerate_post',
    limit: 10,
    windowMs: 60_000,
    message: 'Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.',
  });
  if (limited) return limited;

  const teamId = parseTeamId((await context.params).teamRef);
  if (!teamId) return jsonNoStore({ error: 'Equipo inválido.' }, 400);
  const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== true) return jsonNoStore({ error: 'Debes confirmar la regeneración.' }, 400);

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonNoStore({ error: 'Authentication required' }, 401);

  const { data, error } = await supabase.rpc('regenerate_team_general_invitation_token', {
    p_team_id: teamId,
  });
  if (error || !data) return jsonNoStore({ error: 'Equipo no encontrado.' }, 404);

  const { error: analyticsError } = await supabase
    .from('product_analytics_events')
    .insert({
      event_name: 'team_invitation_link_regenerated',
      user_id: user.id,
      source: 'team_profile',
      channel: 'team_invitation_link',
      payload: { team_id: teamId },
    });
  if (analyticsError) {
    console.warn('Team invitation link analytics failed:', analyticsError.code);
  }

  return jsonNoStore({ link: buildLink(String(data), request) });
}
