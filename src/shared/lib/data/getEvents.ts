import { getServerSupabase } from '@src/core/api/supabase.server';
import { log } from '@src/core/lib/logger';

type DateOrder = 'asc' | 'desc';

function getDateValue(raw: unknown) {
  if (!raw) return Number.NEGATIVE_INFINITY;
  const parsed = new Date(String(raw)).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function sortEventsByStartTime(rows: any[], dateOrder: DateOrder) {
  return [...rows].sort((a, b) => {
    const aTime = getDateValue(a?.start_time);
    const bTime = getDateValue(b?.start_time);

    if (aTime === bTime) return 0;
    return dateOrder === 'asc' ? aTime - bTime : bTime - aTime;
  });
}

export async function getEvents(options?: { dateOrder?: DateOrder }) {
  const dateOrder: DateOrder = options?.dateOrder === 'desc' ? 'desc' : 'asc';
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('event')
    .select('*')
    .order('start_time', { ascending: dateOrder === 'asc', nullsFirst: false });

  if (error) {
    log.database('SELECT getEvents', 'event', error);
    throw new Error('Failed to fetch data');
  }

  return sortEventsByStartTime(data ?? [], dateOrder);
}
