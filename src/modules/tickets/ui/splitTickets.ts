import type { TicketEvent } from '../model/TicketEvent';

function parseEventDate(formattedDateTime: string): Date | null {
  // Tu lógica actual: split('|')[1]
  const part = formattedDateTime?.split('|')?.[1]?.trim();
  if (!part) return null;

  const d = new Date(part);
  return isNaN(d.getTime()) ? null : d;
}

export function splitTicketsByDate(events: TicketEvent[]) {
  const now = new Date();

  const upcoming: TicketEvent[] = [];
  const past: TicketEvent[] = [];

  for (const ev of events) {
    const d = parseEventDate(ev.formattedDateTime);
    if (!d) {
      past.push(ev);
      continue;
    }
    if (d > now) upcoming.push(ev);
    else past.push(ev);
  }

  return { upcoming, past };
}
