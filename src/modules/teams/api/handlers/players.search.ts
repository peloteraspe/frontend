// src/modules/teams/api/handlers/players.search.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@core/api/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Number(searchParams.get('limit') || 10);

  if (q.length < 2) return NextResponse.json({ data: [] });

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from('users_view') //review this table name
    .select('id, name, email, avatar')
    .ilike('name', `%${q}%`)
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}
