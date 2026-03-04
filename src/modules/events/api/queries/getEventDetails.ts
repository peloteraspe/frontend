import { getServerSupabase } from '@core/api/supabase.server';
import { backendFetch, backendUrl } from '@core/api/backend';
import { log } from '@core/lib/logger';

export async function getEventDetails(id: string) {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase.from('event').select('*').eq('id', id).maybeSingle();

  if (error) {
    log.database('SELECT event by id', 'event', error as any, { id });
  }

  if (data) {
    return data;
  }

  // Fallback al backend legacy para eventos que aún no están en Supabase.
  try {
    const res = await backendFetch(backendUrl(`/event/${encodeURIComponent(id)}`), { method: 'GET' });
    log.apiCall('GET', `/event/${id}`, res.status, { source: 'backend-fallback' });

    if (!res.ok) return null;
    const json = await res.json();
    return json?.event ? json : json ?? null;
  } catch (fallbackError) {
    log.error('Fallback fetch event by id failed', 'EVENT_DETAILS', fallbackError, { id });
    return null;
  }

}
