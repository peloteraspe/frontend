export type OptionSelect = { key: number; value: number; label: string };

async function safeJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  return json as T;
}

export async function fetchPositionsOptions(): Promise<OptionSelect[]> {
  const res = await fetch('/api/positions', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch positions: ${res.status}`);
  const json = await safeJson<{ data?: OptionSelect[] }>(res);
  return json.data ?? [];
}

export async function fetchLevelsOptions(): Promise<OptionSelect[]> {
  const res = await fetch('/api/levels', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch levels: ${res.status}`);
  const json = await safeJson<{ data?: OptionSelect[] }>(res);
  return json.data ?? [];
}
