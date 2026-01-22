import { cookies } from 'next/headers';
import { getServerSupabase } from '@src/core/api/supabase.server';
import { log } from '@src/core/lib/logger';

export async function getEventById(id: string) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from('event').select('*').eq('id', id).single();
  if (error) {
    log.database('SELECT getEventById', 'event', error, { id });
    return null;
  }
  return data;
}
