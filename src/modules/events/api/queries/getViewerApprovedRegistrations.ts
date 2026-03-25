import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';

export type ViewerEventRegistrationState = 'approved' | 'pending';

function normalizeEventId(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeRegistrationState(value: unknown): ViewerEventRegistrationState | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'approved' || normalized === 'pending') return normalized;
  return null;
}

export async function getViewerRegistrationStatesByEventIds(
  eventIds: Array<string | number>,
  supabaseClient?: any,
  userId?: string | null
) {
  const normalizedEventIds = Array.from(
    new Set(eventIds.map((eventId) => normalizeEventId(eventId)).filter((eventId) => eventId.length > 0))
  );
  const statesByEventId = new Map<string, ViewerEventRegistrationState>();

  if (!normalizedEventIds.length) return statesByEventId;

  const supabase = supabaseClient ?? (await getServerSupabase());

  let viewerId = String(userId || '').trim();
  if (!viewerId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      log.warn('Could not resolve viewer for approved registration lookup', 'EVENTS', {
        error: userError,
        eventIds: normalizedEventIds,
      });
      return statesByEventId;
    }

    viewerId = String(user?.id || '').trim();
  }

  if (!viewerId) return statesByEventId;

  const { data, error } = await supabase
    .from('assistants')
    .select('event,state')
    .eq('user', viewerId)
    .in('state', ['approved', 'pending'])
    .in('event', normalizedEventIds as any);

  if (error) {
    log.database('SELECT viewer registration states by events', 'assistants', error, {
      eventIds: normalizedEventIds,
      userId: viewerId,
    });
    return statesByEventId;
  }

  (data ?? []).forEach((assistant: any) => {
    const eventId = normalizeEventId(assistant?.event);
    const state = normalizeRegistrationState(assistant?.state);
    if (!eventId) return;
    if (!state) return;

    const currentState = statesByEventId.get(eventId);
    if (state === 'approved' || !currentState) {
      statesByEventId.set(eventId, state);
    }
  });

  return statesByEventId;
}

export async function getViewerApprovedRegistrationEventIds(
  eventIds: Array<string | number>,
  supabaseClient?: any,
  userId?: string | null
) {
  const statesByEventId = await getViewerRegistrationStatesByEventIds(eventIds, supabaseClient, userId);
  const approvedEventIds = new Set<string>();

  statesByEventId.forEach((state, eventId) => {
    if (state === 'approved') approvedEventIds.add(eventId);
  });

  return approvedEventIds;
}

export async function getViewerPendingRegistrationEventIds(
  eventIds: Array<string | number>,
  supabaseClient?: any,
  userId?: string | null
) {
  const statesByEventId = await getViewerRegistrationStatesByEventIds(eventIds, supabaseClient, userId);
  const pendingEventIds = new Set<string>();

  statesByEventId.forEach((state, eventId) => {
    if (state === 'pending') pendingEventIds.add(eventId);
  });

  return pendingEventIds;
}

export async function getViewerRegistrationState(
  eventId: string | number,
  supabaseClient?: any,
  userId?: string | null
) {
  const statesByEventId = await getViewerRegistrationStatesByEventIds([eventId], supabaseClient, userId);
  return statesByEventId.get(normalizeEventId(eventId)) ?? null;
}

export async function hasViewerApprovedRegistration(
  eventId: string | number,
  supabaseClient?: any,
  userId?: string | null
) {
  const state = await getViewerRegistrationState(eventId, supabaseClient, userId);
  return state === 'approved';
}

export async function hasViewerPendingRegistration(
  eventId: string | number,
  supabaseClient?: any,
  userId?: string | null
) {
  const state = await getViewerRegistrationState(eventId, supabaseClient, userId);
  return state === 'pending';
}

export async function hasViewerLockedRegistration(
  eventId: string | number,
  supabaseClient?: any,
  userId?: string | null
) {
  const state = await getViewerRegistrationState(eventId, supabaseClient, userId);
  return state === 'approved' || state === 'pending';
}
