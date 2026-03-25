import { getServerSupabase } from '@core/api/supabase.server';
import { getEventCatalogs } from '@modules/events/api/queries/getEventCatalogs';
import {
  getApprovedParticipantsCountByEventId,
  getApprovedParticipantsCountByEventIds,
} from '@modules/events/api/queries/getApprovedParticipantsCount';
import { getViewerRegistrationStatesByEventIds } from '@modules/events/api/queries/getViewerApprovedRegistrations';
import { normalizeEvent } from '@modules/events/lib/normalizeEvent';
import { getPlacesLeft, isEventSoldOut } from '@modules/events/lib/eventCapacity';
import { EventEntity } from '@modules/events/model/types';

type IdNameRow = {
  id: number;
  name: string;
};

function toDictionary(rows: IdNameRow[] | null | undefined) {
  return (rows ?? []).reduce<Record<number, string>>((acc, row) => {
    acc[row.id] = row.name;
    return acc;
  }, {});
}

export async function getEventsExplorer(): Promise<EventEntity[]> {
  const supabase = await getServerSupabase();

  const [eventsRes, catalogs] = await Promise.all([
    supabase
      .from('event')
      .select('*')
      .eq('is_published', true)
      .order('start_time', { ascending: true, nullsFirst: false }),
    getEventCatalogs(),
  ]);

  if (eventsRes.error) {
    throw new Error(eventsRes.error.message);
  }

  const eventTypeById = toDictionary(catalogs.eventTypes as IdNameRow[]);
  const levelById = toDictionary(catalogs.levels as IdNameRow[]);
  const normalizedEvents = (eventsRes.data ?? []).map((event) => normalizeEvent(event, eventTypeById, levelById));
  const eventIds = normalizedEvents.map((event) => event.id);
  const [approvedCountByEventId, viewerRegistrationStatesByEventId] = await Promise.all([
    getApprovedParticipantsCountByEventIds(eventIds, supabase),
    getViewerRegistrationStatesByEventIds(eventIds, supabase),
  ]);

  return normalizedEvents.map((event) => {
    const approvedCount = approvedCountByEventId.get(event.id) ?? 0;
    const viewerRegistrationState = viewerRegistrationStatesByEventId.get(event.id) ?? null;
    return {
      ...event,
      approvedCount,
      placesLeft: getPlacesLeft(event.maxUsers, approvedCount),
      isSoldOut: isEventSoldOut(event.maxUsers, approvedCount),
      viewerHasApprovedRegistration: viewerRegistrationState === 'approved',
      viewerHasPendingRegistration: viewerRegistrationState === 'pending',
    };
  });
}

export async function getEventExplorerById(id: string): Promise<EventEntity | null> {
  const supabase = await getServerSupabase();
  const [eventRes, catalogs] = await Promise.all([
    supabase.from('event').select('*').eq('id', id).eq('is_published', true).maybeSingle(),
    getEventCatalogs(),
  ]);

  if (eventRes.error || !eventRes.data) return null;

  const eventTypeById = toDictionary(catalogs.eventTypes as IdNameRow[]);
  const levelById = toDictionary(catalogs.levels as IdNameRow[]);
  const event = normalizeEvent(eventRes.data, eventTypeById, levelById);
  const [approvedCount, viewerRegistrationStatesByEventId] = await Promise.all([
    getApprovedParticipantsCountByEventId(id, supabase),
    getViewerRegistrationStatesByEventIds([id], supabase),
  ]);
  const viewerRegistrationState = viewerRegistrationStatesByEventId.get(String(id)) ?? null;

  return {
    ...event,
    approvedCount,
    placesLeft: getPlacesLeft(event.maxUsers, approvedCount),
    isSoldOut: isEventSoldOut(event.maxUsers, approvedCount),
    viewerHasApprovedRegistration: viewerRegistrationState === 'approved',
    viewerHasPendingRegistration: viewerRegistrationState === 'pending',
  };
}
