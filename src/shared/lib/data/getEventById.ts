import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { log } from "'../../../src/shared/lib/logger'";

export async function getEventById(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.from('event').select('*').eq('id', id).single();
  if (error) {
    log.database('SELECT getEventById', 'event', error, { id });
    return null;
  }
  return data;
}
