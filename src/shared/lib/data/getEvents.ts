import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { log } from "'../../../src/shared/lib/logger'";

export async function getEvents() {
  // Await cookies() to get the resolved cookies object.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.from('event').select('*');

  if (error) {
    log.database('SELECT getEvents', 'event', error);
    throw new Error('Failed to fetch data');
  }

  return data;
}
