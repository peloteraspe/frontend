import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    log.info('API: Fetching player positions', 'api/positions');
    
    const { data: positions, error } = await supabase
      .from('player_position')
      .select('id, name');
    
    if (error) {
      log.error('Failed to fetch positions', 'api/positions', error);
      return NextResponse.json(
        { error: 'Failed to fetch positions' },
        { status: 500 }
      );
    }
    
    log.debug('Positions fetched successfully', 'api/positions', { count: positions?.length });
    
    return NextResponse.json({
      data: positions?.map((position) => ({
        key: position.id,
        value: position.id,
        label: position.name,
      })) || []
    });
  } catch (error) {
    log.error('API error in positions endpoint', 'api/positions', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
