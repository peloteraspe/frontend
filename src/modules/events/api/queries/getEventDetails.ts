import { getServerSupabase } from '@core/api/supabase.server';
import { backendFetch, backendUrl } from '@core/api/backend';
import { log } from '@core/lib/logger';

type EventFeatureRow = {
  feature: number | string | null;
};

type FeatureRow = {
  id: number | string;
  name: string | null;
};

function uniqueNumbers(values: Array<number | string | null | undefined>) {
  const ids = new Set<number>();

  values.forEach((value) => {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n)) ids.add(n);
  });

  return Array.from(ids);
}

async function getEventFeaturesByEventId(supabase: any, eventId: string) {
  const { data: eventFeaturesData, error: eventFeaturesError } = await supabase
    .from('eventFeatures')
    .select('feature')
    .eq('event', eventId);

  if (eventFeaturesError) {
    log.database('SELECT event features by event id', 'eventFeatures', eventFeaturesError as any, { eventId });
    return [];
  }

  const eventFeatureRows = (eventFeaturesData ?? []) as EventFeatureRow[];
  const featureIds = uniqueNumbers(eventFeatureRows.map((row) => row.feature));

  if (!featureIds.length) return [];

  const { data: featureData, error: featuresError } = await supabase
    .from('features')
    .select('id, name')
    .in('id', featureIds);

  if (featuresError) {
    log.database('SELECT features by ids', 'features', featuresError as any, { eventId, featureIds });
    return [];
  }

  const featureRows = (featureData ?? []) as FeatureRow[];
  const featureNameById = new Map<string, string>(
    featureRows.map((row) => [String(row.id), row.name || 'Extra'])
  );

  return eventFeatureRows
    .map((row) => {
      if (row.feature == null) return null;
      const id = String(row.feature);
      const name = featureNameById.get(id);
      if (!name) return null;
      return { feature: { id: row.feature, name } };
    })
    .filter(Boolean);
}

export async function getEventDetails(id: string) {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase.from('event').select('*').eq('id', id).maybeSingle();

  if (error) {
    log.database('SELECT event by id', 'event', error as any, { id });
  }

  if (data) {
    const featuresData = await getEventFeaturesByEventId(supabase, String(data.id ?? id));
    return {
      ...data,
      featuresData,
    };
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
