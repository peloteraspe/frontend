import { getServerSupabase } from '@core/api/supabase.server';

export async function getEventDetails(id: string) {
  const supabase = await getServerSupabase();

  // Ajusta esto según tu estructura real de tablas/joins.
  // Aquí lo dejo similar a tu getEventById actual.
  const { data, error } = await supabase.from('event').select('*').eq('id', id).single();

  if (error || !data) return null;

  // Si necesitas assistants/payment/etc, aquí haces joins o queries adicionales.
  // return { event: data, assistants: ... }
  return data;
}
