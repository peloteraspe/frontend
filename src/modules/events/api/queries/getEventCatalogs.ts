import { getServerSupabase } from '@core/api/supabase.server';
import { CatalogOption } from '@modules/events/model/types';

const DEFAULT_EVENT_TYPES = ['Pichanga libre', 'Versus de equipos'];
const DEFAULT_LEVELS = ['Sin Experiencia', 'Intermedio', 'Avanzado'];

async function seedIfEmpty(table: 'eventType' | 'level', defaults: string[]) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from(table).select('id,name').order('id', { ascending: true });

  if (error) throw new Error(error.message);

  if ((data ?? []).length > 0) {
    return data as CatalogOption[];
  }

  const { data: inserted, error: insertError } = await supabase
    .from(table)
    .insert(defaults.map((name) => ({ name })))
    .select('id,name')
    .order('id', { ascending: true });

  if (insertError) throw new Error(insertError.message);
  return (inserted ?? []) as CatalogOption[];
}

export async function getEventCatalogs(): Promise<{
  eventTypes: CatalogOption[];
  levels: CatalogOption[];
}> {
  const [eventTypes, levels] = await Promise.all([
    seedIfEmpty('eventType', DEFAULT_EVENT_TYPES),
    seedIfEmpty('level', DEFAULT_LEVELS),
  ]);

  return { eventTypes, levels };
}
