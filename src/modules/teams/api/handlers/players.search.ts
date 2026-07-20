// src/modules/teams/api/handlers/players.search.ts
import { getServerSupabase } from '@src/core/api/supabase.server';
import { rateLimitByRequest } from '@core/api/rateLimit';
import { jsonNoStore } from '@core/api/responses';

export async function GET(req: Request) {
  const limited = await rateLimitByRequest(req, {
    keyPrefix: 'api_players_search_get',
    limit: 90,
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
  const requestedLimit = Number(searchParams.get('limit') || 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 20)
    : 10;

  if (q.length < 2) return jsonNoStore({ data: [] });

  const { data, error } = await supabase
    .from('users_view') //review this table name
    .select('id, name, avatar')
    .ilike('name', `%${q}%`)
    .limit(limit);

  if (error) return jsonNoStore({ error: 'Search failed' }, 500);
  return jsonNoStore({ data: data ?? [] });
}
