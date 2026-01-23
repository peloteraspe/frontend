import { backendUrl, backendFetch } from '@core/api/backend';
import { log } from '@core/lib/logger';
import type { TicketEvent } from '../../model/TicketEvent';

export async function getUserTickets(userId: string): Promise<TicketEvent[]> {
  const url = backendUrl(`/event?userId=${encodeURIComponent(userId)}`);
  const res = await backendFetch(url, { method: 'GET' });

  log.apiCall('GET', `/event?userId=${userId}`, res.status);

  if (!res.ok) throw new Error('Failed to fetch events');

  const json = await res.json();
  // si tu backend devuelve { data: [...] } ajusta aquí
  return (Array.isArray(json) ? json : json?.data) ?? [];
}
