import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function getEventById(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.from('event').select('*').eq('id', id).single();
  if (error) {
    console.error('Error fetching event:', error.message);
    return null;
  }
  return data;
}
