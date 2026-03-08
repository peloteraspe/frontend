import { getServerSupabase } from '@src/core/api/supabase.server';
import { log } from '@src/core/lib/logger';

type DateOrder = 'asc' | 'desc';
type GetEventsOptions = {
  dateOrder?: DateOrder;
  createdById?: string;
};

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

export async function getEvents(options?: GetEventsOptions) {
  const dateOrder: DateOrder = options?.dateOrder === 'desc' ? 'desc' : 'asc';
  const createdById = String(options?.createdById || '').trim();
  const supabase = await getServerSupabase();
  let query = supabase
    .from('event')
    .select('*')
    .order('start_time', { ascending: dateOrder === 'asc', nullsFirst: false });

  if (createdById) {
    query = query.eq('created_by_id', createdById);
  }

  const { data, error } = await query;

  if (error) {
    log.database('SELECT getEvents', 'event', error);
    throw new Error('Failed to fetch data');
  }

  return sortEventsByStartTime(data ?? [], dateOrder);
}
