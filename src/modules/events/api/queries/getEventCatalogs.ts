import { getServerSupabase } from '@core/api/supabase.server';
import { CatalogOption } from '@modules/events/model/types';

function normalizeCatalogName(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function dedupeCatalogOptions(rows: unknown[] | null): CatalogOption[] {
  const optionByName = new Map<string, CatalogOption>();

  (rows ?? []).forEach((rawRow) => {
    const row = rawRow as { id?: unknown; name?: unknown };
    const id = Number(row.id);
    const name = String(row.name || '').trim();
    const normalizedName = normalizeCatalogName(name);
    if (!Number.isInteger(id) || id <= 0 || !normalizedName) return;

    const current = optionByName.get(normalizedName);
    if (!current || id < current.id) optionByName.set(normalizedName, { id, name });
  });

  return Array.from(optionByName.values()).sort((a, b) => a.id - b.id);
}

async function readCatalog(table: 'eventType' | 'level') {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from(table)
    .select('id,name')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return dedupeCatalogOptions(data ?? []);
}

export async function getEventCatalogs(): Promise<{
  eventTypes: CatalogOption[];
  levels: CatalogOption[];
}> {
  const [eventTypes, levels] = await Promise.all([
    readCatalog('eventType'),
    readCatalog('level'),
  ]);

  return { eventTypes, levels };
}
