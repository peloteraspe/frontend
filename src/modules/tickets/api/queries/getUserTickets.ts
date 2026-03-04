import { backendUrl, backendFetch } from '@core/api/backend';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import type { TicketEvent } from '../../model/TicketEvent';

type AssistantRow = {
  id: number;
  event: number | null;
  state: string | null;
  created_at?: string | null;
};

type TicketRow = {
  id: number;
  assistant_id: number;
  status: 'pending' | 'active' | 'used' | 'revoked';
  qr_token: string | null;
  google_wallet_url: string | null;
  apple_wallet_url: string | null;
};

function isMissingTicketTableError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('ticket') && message.includes('does not exist');
}

function toTicketStatus(state: string | null | undefined): 'pending' | 'active' | 'used' | 'revoked' {
  if (state === 'approved') return 'active';
  if (state === 'rejected') return 'revoked';
  return 'pending';
}

function toFormattedDateTime(event: any): string {
  if (typeof event?.formattedDateTime === 'string' && event.formattedDateTime.trim()) {
    return event.formattedDateTime;
  }

  const startTime = event?.start_time;
  if (!startTime) return 'Fecha por confirmar';

  const dt = new Date(startTime);
  if (Number.isNaN(dt.getTime())) return 'Fecha por confirmar';

  return dt.toLocaleString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function getUserTickets(userId: string): Promise<TicketEvent[]> {
  const supabase = await getServerSupabase();

  const [{ data: assistants, error: assistantsError }, res] = await Promise.all([
    supabase.from('assistants').select('id, event, state, created_at').eq('user', userId),
    backendFetch(backendUrl('/event'), { method: 'GET' }),
  ]);

  if (assistantsError) {
    log.database('SELECT assistants', 'assistants', assistantsError as any, { userId });
    throw new Error('Failed to fetch user registrations');
  }

  log.apiCall('GET', '/event', res.status, { userId });

  if (!res.ok) throw new Error('Failed to fetch events');

  const json = await res.json();
  const allEvents = (Array.isArray(json) ? json : json?.data) ?? [];

  const assistantsRows = ((assistants ?? []) as AssistantRow[]).filter((assistant) => assistant?.event != null);

  assistantsRows.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const assistantsByEventId = new Map<string, AssistantRow>();
  for (const assistant of assistantsRows) {
    const eventId = String(assistant.event);
    if (assistant.state === 'rejected') continue;
    if (!assistantsByEventId.has(eventId)) {
      assistantsByEventId.set(eventId, assistant);
    }
  }

  if (!assistantsByEventId.size) return [];

  const assistantIds = Array.from(assistantsByEventId.values()).map((assistant) => assistant.id);
  const ticketsByAssistantId = new Map<string, TicketRow>();

  if (assistantIds.length) {
    const { data: tickets, error: ticketsError } = await supabase
      .from('ticket')
      .select('id, assistant_id, status, qr_token, google_wallet_url, apple_wallet_url')
      .in('assistant_id', assistantIds);

    if (ticketsError) {
      if (isMissingTicketTableError(ticketsError)) {
        log.warn('Tickets table not found yet. Run migrations to enable QR entries.', 'TICKETS');
      } else {
        log.database('SELECT tickets', 'ticket', ticketsError as any, { userId, assistantIds });
      }
    } else {
      for (const ticket of (tickets ?? []) as TicketRow[]) {
        ticketsByAssistantId.set(String(ticket.assistant_id), ticket);
      }
    }
  }

  return allEvents
    .filter((event: any) => assistantsByEventId.has(String(event?.id)))
    .map((event: any) => {
      const assistant = assistantsByEventId.get(String(event?.id)) as AssistantRow;
      const ticket = ticketsByAssistantId.get(String(assistant.id));
      const qrToken = ticket?.qr_token ?? null;
      const qrValue = qrToken ? `PELOTERAS:TICKET:${qrToken}` : null;
      const qrImageUrl = qrValue
        ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrValue)}`
        : null;

      return {
        ...event,
        formattedDateTime: toFormattedDateTime(event),
        startTime: event?.start_time ?? null,
        ticket: {
          id: ticket?.id ?? null,
          assistantId: assistant.id,
          status: ticket?.status ?? toTicketStatus(assistant.state),
          qrToken,
          qrValue,
          qrImageUrl,
          googleWalletUrl: ticket?.google_wallet_url ?? null,
          appleWalletUrl: ticket?.apple_wallet_url ?? null,
        },
      } satisfies TicketEvent;
    });
}
