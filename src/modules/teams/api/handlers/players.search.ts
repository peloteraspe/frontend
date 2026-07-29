// src/modules/teams/api/handlers/players.search.ts
import { getServerSupabase } from '@src/core/api/supabase.server';
import { rateLimitByRequest } from '@core/api/rateLimit';
import { jsonNoStore } from '@core/api/responses';
import type { TeamInvitationCandidate } from '@modules/teams/model/types';

type CandidateRpcRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  team_status: TeamInvitationCandidate['status'];
};

export async function GET(req: Request) {
  const limited = await rateLimitByRequest(req, {
    keyPrefix: 'api_players_search_get',
    limit: 30,
    windowMs: 60_000,
    message: 'Demasiadas búsquedas de jugadoras. Espera un momento e inténtalo nuevamente.',
  });
  if (limited) return limited;

  const supabase = await getServerSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonNoStore({ error: 'Authentication required' }, 401);
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const teamId = Number(searchParams.get('team_id'));

  if (!Number.isSafeInteger(teamId) || teamId <= 0) {
    return jsonNoStore({ error: 'Invalid team' }, 400);
  }

  if (q.length < 2) return jsonNoStore({ data: [] });

  const { data, error } = await supabase
    .rpc('search_team_invitation_candidates', {
      p_team_id: teamId,
      p_query: q,
      p_limit: 10,
    });

  if (error?.code === '42501') {
    return jsonNoStore({ error: 'Not allowed' }, 403);
  }

  if (error) return jsonNoStore({ error: 'Search failed' }, 500);

  const candidates: TeamInvitationCandidate[] = ((data ?? []) as CandidateRpcRow[]).map(
    (candidate) => ({
      id: candidate.user_id,
      username: candidate.username,
      displayName: candidate.display_name,
      avatarUrl: candidate.avatar_url,
      status: candidate.team_status,
    })
  );

  const queryKind = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(q.toLowerCase())
    ? 'email_exact'
    : 'username';
  const { error: analyticsError } = await supabase.from('product_analytics_events').insert({
    event_name: 'team_player_search',
    user_id: user.id,
    source: 'team_profile',
    channel: 'team_invitation',
    payload: {
      team_id: teamId,
      query_kind: queryKind,
      result_count: candidates.length,
    },
  });
  if (analyticsError) {
    console.warn('Team player search analytics failed:', analyticsError.code);
  }

  return jsonNoStore({ data: candidates });
}
