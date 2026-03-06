// src/modules/teams/api/handlers/players.search.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@src/core/api/supabase.server';
import { rateLimitByRequest } from '@core/api/rateLimit';

export async function GET(req: Request) {
  const limited = await rateLimitByRequest(req, {
    keyPrefix: 'api_players_search_get',
    limit: 90,
    windowMs: 60_000,
    message: 'Demasiadas búsquedas de jugadoras. Espera un momento e inténtalo nuevamente.',
  });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const requestedLimit = Number(searchParams.get('limit') || 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 20)
    : 10;

  if (q.length < 2) return NextResponse.json({ data: [] });

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from('users_view') //review this table name
    .select('id, name, email, avatar')
    .ilike('name', `%${q}%`)
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}
