import type { TicketEvent } from '../model/TicketEvent';

function parseEventDate(event: TicketEvent): Date | null {
  const startTime = event.startTime ?? event.start_time ?? null;
  if (typeof startTime === 'string' && startTime.trim()) {
    const direct = new Date(startTime);
    if (!isNaN(direct.getTime())) return direct;
  }

  const part = event.formattedDateTime?.split('|')?.[1]?.trim() || event.formattedDateTime;
  if (!part) return null;

  const fallback = new Date(part);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function splitTicketsByDate(events: TicketEvent[]) {
  const now = new Date();

  const upcoming: TicketEvent[] = [];
  const past: TicketEvent[] = [];

  for (const ev of events) {
    const d = parseEventDate(ev);
    if (!d) {
      past.push(ev);
      continue;
    }
    if (d > now) upcoming.push(ev);
    else past.push(ev);
  }

  return { upcoming, past };
}
