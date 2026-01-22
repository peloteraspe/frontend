// src/modules/users/api/handlers/levels.ts
import { getServerSupabase } from '@src/core/api/supabase.server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { log } from '@src/core/lib/logger';

export async function GET() {
  try {
    const supabase = await getServerSupabase();

    log.info('API: Fetching levels', 'api/levels');

    const { data: levels, error } = await supabase.from('level').select('*');

    if (error) {
      log.error('Failed to fetch levels', 'api/levels', error);
      return NextResponse.json({ error: 'Failed to fetch levels' }, { status: 500 });
    }

    log.debug('Levels fetched successfully', 'api/levels', { count: levels?.length });

    return NextResponse.json({
      data:
        levels?.map((level) => ({
          key: level.id,
          value: level.id,
          label: level.name,
        })) ?? [],
    });
  } catch (error) {
    log.error('API error in levels endpoint', 'api/levels', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
