import { getServerSupabase } from '@src/core/api/supabase.server';
import { cookies } from 'next/headers';
import { log } from '@src/core/lib/logger';

export async function getEvents() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from('event').select('*');

  if (error) {
    log.database('SELECT getEvents', 'event', error);
    throw new Error('Failed to fetch data');
  }

  return data;
}
