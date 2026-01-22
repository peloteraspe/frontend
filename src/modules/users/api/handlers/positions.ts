// src/modules/users/api/handlers/positions.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@src/core/api/supabase.server';
import { log } from '@src/core/lib/logger';

export async function GET() {
  try {
    const supabase = await getServerSupabase();

    log.info('API: Fetching player positions', 'api/positions');

    const { data: positions, error } = await supabase.from('player_position').select('id, name');

    if (error) {
      log.error('Failed to fetch positions', 'api/positions', error);
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
    }

    log.debug('Positions fetched successfully', 'api/positions', { count: positions?.length });

    return NextResponse.json(
      {
        data:
          positions?.map((p) => ({
            key: p.id,
            value: p.id,
            label: p.name,
          })) ?? [],
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    log.error('API error in positions endpoint', 'api/positions', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
