import type { TicketEvent } from '../model/TicketEvent';

function parseDate(value: string | null | undefined): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseEventStartDate(event: TicketEvent): Date | null {
  const direct = parseDate(event.startTime ?? event.start_time ?? null);
  if (direct) return direct;

  const part = event.formattedDateTime?.split('|')?.[1]?.trim() || event.formattedDateTime;
  if (!part) return null;

  const fallback = new Date(part);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function parseEventEndDate(event: TicketEvent): Date | null {
  return parseDate(event.endTime ?? event.end_time ?? null) ?? parseEventStartDate(event);
}

function compareByEventDateAsc(a: TicketEvent, b: TicketEvent) {
  const aTime = parseEventStartDate(a)?.getTime() ?? 0;
  const bTime = parseEventStartDate(b)?.getTime() ?? 0;
  return aTime - bTime;
}

export function splitTicketsByDate(events: TicketEvent[]) {
  const now = new Date();

  const active: TicketEvent[] = [];
  const past: TicketEvent[] = [];

  for (const ev of events) {
    const d = parseEventEndDate(ev);
    if (!d) {
      past.push(ev);
      continue;
    }
    if (d > now) active.push(ev);
    else past.push(ev);
  }

  active.sort(compareByEventDateAsc);

  return { active, past };
}
