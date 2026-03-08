import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import type { TicketEvent } from '../../model/TicketEvent';
import { buildGoogleWalletSaveUrl, getGoogleWalletConfig } from '../services/google-wallet.service';

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

type EventRow = {
  id: number;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  location_text: string | null;
  price: number | string | null;
  min_users: number | null;
  max_users: number | null;
  EventType: number | null;
  level: number | null;
};

type EventTypeRow = {
  id: number;
  name: string | null;
};

type LevelRow = {
  id: number;
  name: string | null;
};

type EventFeatureRow = {
  event: number;
  feature: number;
};

type FeatureRow = {
  id: number;
  name: string | null;
};

type ProfileRow = {
  username: string | null;
};

const DEFAULT_TIMEZONE = 'America/Lima';

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

  const startTime = event?.start_time ?? event?.startTime;
  if (!startTime) return 'Fecha por confirmar';

  const dt = new Date(startTime);
  if (Number.isNaN(dt.getTime())) return 'Fecha por confirmar';

  return dt.toLocaleString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DEFAULT_TIMEZONE,
  });
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is number => Number.isFinite(value as number))));
}

function asNumber(value: number | string | null | undefined, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function resolveTicketHolderName(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('profile')
    .select('username')
    .eq('user', userId)
    .maybeSingle();

  if (error) {
    log.database('SELECT profile username for tickets view', 'profile', error, { userId });
    return 'Peloteras';
  }

  const profile = data as ProfileRow | null;
  if (profile?.username && profile.username.trim()) {
    return profile.username.trim();
  }

  return 'Peloteras';
}

function mapSupabaseEventToCardEvent(
  event: EventRow,
  eventTypeById: Map<string, string>,
  levelById: Map<string, string>,
  featuresByEventId: Map<string, string[]>
) {
  const eventId = String(event.id);
  const eventTypeName = eventTypeById.get(String(event.EventType)) ?? 'Partido';
  const levelName = levelById.get(String(event.level)) ?? 'Sin nivel';
  const featureNames = featuresByEventId.get(eventId) ?? [];
  const maxUsers = asNumber(event.max_users, 0);
  const minUsers = asNumber(event.min_users, 0);
  const placesLeft = Math.max(maxUsers - minUsers, 0);

  return {
    id: event.id,
    title: event.title ?? 'Evento sin título',
    formattedDateTime: toFormattedDateTime({ start_time: event.start_time }),
    start_time: event.start_time,
    startTime: event.start_time,
    locationText: event.location_text ?? 'Ubicación por confirmar',
    price: asNumber(event.price, 0),
    placesLeft: placesLeft > 0 ? placesLeft : maxUsers,
    eventType: { name: eventTypeName },
    level: { name: levelName },
    featuresData: featureNames.map((name) => ({ feature: { name } })),
  };
}

export async function getUserTickets(userId: string): Promise<TicketEvent[]> {
  const supabase = await getServerSupabase();
  const ticketHolderName = await resolveTicketHolderName(supabase, userId);
  const googleWalletConfig = await getGoogleWalletConfig();

  const { data: assistants, error: assistantsError } = await supabase
    .from('assistants')
    .select('id, event, state, created_at')
    .eq('user', userId);

  if (assistantsError) {
    log.database('SELECT assistants', 'assistants', assistantsError as any, { userId });
    throw new Error('Failed to fetch user registrations');
  }

  const assistantsRows = ((assistants ?? []) as AssistantRow[]).filter((assistant) => assistant?.event != null);

  assistantsRows.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const assistantsByEventId = new Map<string, AssistantRow>();
  for (const assistant of assistantsRows) {
    const eventId = String(assistant.event);
    if (!assistantsByEventId.has(eventId)) {
      assistantsByEventId.set(eventId, assistant);
    }
  }

  if (!assistantsByEventId.size) return [];

  const assistantIds = Array.from(assistantsByEventId.values()).map((assistant) => assistant.id);
  const eventIds = uniqueNumbers(
    Array.from(assistantsByEventId.values()).map((assistant) => assistant.event)
  );
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

  if (!eventIds.length) return [];

  const { data: eventsData, error: eventsError } = await supabase
    .from('event')
    .select('id, title, start_time, end_time, location_text, price, min_users, max_users, EventType, level')
    .in('id', eventIds);

  if (eventsError) {
    log.database('SELECT enrolled events', 'event', eventsError as any, { userId, eventIds });
    throw new Error('Failed to fetch enrolled events');
  }

  const eventRows = (eventsData ?? []) as EventRow[];
  if (!eventRows.length) return [];

  const eventTypeIds = uniqueNumbers(eventRows.map((event) => event.EventType));
  const levelIds = uniqueNumbers(eventRows.map((event) => event.level));

  let eventTypesRows: EventTypeRow[] = [];
  if (eventTypeIds.length) {
    const { data, error } = await supabase
      .from('eventType')
      .select('id, name')
      .in('id', eventTypeIds);

    if (error) {
      log.database('SELECT event types for tickets', 'eventType', error as any, { eventTypeIds });
    } else {
      eventTypesRows = (data ?? []) as EventTypeRow[];
    }
  }

  let levelsRows: LevelRow[] = [];
  if (levelIds.length) {
    const { data, error } = await supabase.from('level').select('id, name').in('id', levelIds);
    if (error) {
      log.database('SELECT levels for tickets', 'level', error as any, { levelIds });
    } else {
      levelsRows = (data ?? []) as LevelRow[];
    }
  }

  let eventFeaturesRows: EventFeatureRow[] = [];
  const { data: eventFeaturesData, error: eventFeaturesError } = await supabase
    .from('eventFeatures')
    .select('event, feature')
    .in('event', eventIds);

  if (eventFeaturesError) {
    log.database('SELECT event features for tickets', 'eventFeatures', eventFeaturesError as any, {
      eventIds,
    });
  } else {
    eventFeaturesRows = (eventFeaturesData ?? []) as EventFeatureRow[];
  }

  const featureIds = uniqueNumbers(eventFeaturesRows.map((row) => row.feature));
  let featureRows: FeatureRow[] = [];
  if (featureIds.length) {
    const { data, error } = await supabase.from('features').select('id, name').in('id', featureIds);
    if (error) {
      log.database('SELECT features for tickets', 'features', error as any, { featureIds });
    } else {
      featureRows = (data ?? []) as FeatureRow[];
    }
  }

  const eventTypeById = new Map<string, string>(
    eventTypesRows.map((row) => [String(row.id), row.name || 'Partido'])
  );
  const levelById = new Map<string, string>(
    levelsRows.map((row) => [String(row.id), row.name || 'Sin nivel'])
  );
  const featureNameById = new Map<string, string>(
    featureRows.map((row) => [String(row.id), row.name || 'Extra'])
  );
  const featuresByEventId = new Map<string, string[]>();

  for (const row of eventFeaturesRows) {
    const eventId = String(row.event);
    const current = featuresByEventId.get(eventId) ?? [];
    const featureName = featureNameById.get(String(row.feature));
    if (featureName) current.push(featureName);
    featuresByEventId.set(eventId, current);
  }

  const eventsById = new Map<string, any>();
  for (const event of eventRows) {
    eventsById.set(
      String(event.id),
      mapSupabaseEventToCardEvent(event, eventTypeById, levelById, featuresByEventId)
    );
  }

  const mappedTickets = await Promise.all(
    Array.from(assistantsByEventId.entries()).map(async ([eventId, assistant]) => {
      const event = eventsById.get(eventId);
      if (!event) return null;

      const ticket = ticketsByAssistantId.get(String(assistant.id));
      const qrToken = ticket?.qr_token ?? null;
      const qrValue = qrToken ? `PELOTERAS:TICKET:${qrToken}` : null;
      const qrImageUrl = qrValue
        ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrValue)}`
        : null;
      const googleWalletUrl = ticket?.google_wallet_url
        ? ticket.google_wallet_url
        : qrToken
          ? await buildGoogleWalletSaveUrl(
              {
                qrToken,
                ticketNumber: String(ticket?.id ?? assistant.id),
                ticketHolderName,
              },
              googleWalletConfig
            )
          : null;

      return {
        ...event,
        formattedDateTime: toFormattedDateTime(event),
        startTime: event?.start_time ?? event?.startTime ?? null,
        ticket: {
          id: ticket?.id ?? null,
          assistantId: assistant.id,
          status: ticket?.status ?? toTicketStatus(assistant.state),
          qrToken,
          qrValue,
          qrImageUrl,
          googleWalletUrl,
          appleWalletUrl: ticket?.apple_wallet_url ?? null,
        },
      } satisfies TicketEvent;
    })
  );

  return mappedTickets.filter(Boolean) as TicketEvent[];
}
