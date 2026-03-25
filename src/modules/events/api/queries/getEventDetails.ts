import { getServerSupabase } from '@core/api/supabase.server';
import { backendFetch, backendUrl } from '@core/api/backend';
import { log } from '@core/lib/logger';
import { getViewerRegistrationStatesByEventIds } from '@modules/events/api/queries/getViewerApprovedRegistrations';
import { getPlacesLeft, isEventSoldOut } from '@modules/events/lib/eventCapacity';
import { isAdmin } from '@shared/lib/auth/isAdmin';

type EventFeatureRow = {
  feature: number | string | null;
};

type FeatureRow = {
  id: number | string;
  name: string | null;
};

type AssistantRow = {
  id: number | string;
  user: string | null;
  state: string | null;
};

type ProfileRow = {
  user: string | null;
  username: string | null;
};

function uniqueNumbers(values: Array<number | string | null | undefined>) {
  const ids = new Set<number>();

  values.forEach((value) => {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n)) ids.add(n);
  });

  return Array.from(ids);
}

async function getEventFeaturesByEventId(supabase: any, eventId: string) {
  const { data: eventFeaturesData, error: eventFeaturesError } = await supabase
    .from('eventFeatures')
    .select('feature')
    .eq('event', eventId);

  if (eventFeaturesError) {
    log.database('SELECT event features by event id', 'eventFeatures', eventFeaturesError as any, { eventId });
    return [];
  }

  const eventFeatureRows = (eventFeaturesData ?? []) as EventFeatureRow[];
  const featureIds = uniqueNumbers(eventFeatureRows.map((row) => row.feature));

  if (!featureIds.length) return [];

  const { data: featureData, error: featuresError } = await supabase
    .from('features')
    .select('id, name')
    .in('id', featureIds);

  if (featuresError) {
    log.database('SELECT features by ids', 'features', featuresError as any, { eventId, featureIds });
    return [];
  }

  const featureRows = (featureData ?? []) as FeatureRow[];
  const featureNameById = new Map<string, string>(
    featureRows.map((row) => [String(row.id), row.name || 'Extra'])
  );

  return eventFeatureRows
    .map((row) => {
      if (row.feature == null) return null;
      const id = String(row.feature);
      const name = featureNameById.get(id);
      if (!name) return null;
      return { feature: { id: row.feature, name } };
    })
    .filter(Boolean);
}

function normalizeText(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

async function getApprovedAssistantsByEventId(supabase: any, eventId: string) {
  const { data: assistantsData, error: assistantsError } = await supabase
    .from('assistants')
    .select('id,user,state')
    .eq('event', eventId)
    .eq('state', 'approved');

  if (assistantsError) {
    log.database('SELECT approved assistants by event id', 'assistants', assistantsError as any, {
      eventId,
    });
    return [];
  }

  const assistants = (assistantsData ?? []) as AssistantRow[];
  if (!assistants.length) return [];

  const userIds = Array.from(
    new Set(
      assistants
        .map((assistant) => normalizeText(assistant.user))
        .filter((userId) => userId.length > 0)
    )
  );

  const profileByUserId = new Map<string, string>();
  if (userIds.length) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profile')
      .select('user,username')
      .in('user', userIds as any);

    if (profilesError) {
      log.database('SELECT profiles by user ids for event details', 'profile', profilesError as any, {
        eventId,
        userIds,
      });
    } else {
      ((profilesData ?? []) as ProfileRow[]).forEach((profile) => {
        const userId = normalizeText(profile.user);
        const username = normalizeText(profile.username);
        if (userId && username) profileByUserId.set(userId, username);
      });
    }
  }

  return assistants.map((assistant) => {
    const userId = normalizeText(assistant.user);
    const profileName = userId ? profileByUserId.get(userId) : '';
    const name = normalizeText(profileName, userId ? `Jugadora ${userId.slice(0, 6)}` : 'Participante');
    return {
      id: String(assistant.id),
      user: userId,
      state: normalizeText(assistant.state),
      username: name,
      name,
    };
  });
}

export async function getEventDetails(id: string) {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase.from('event').select('*').eq('id', id).maybeSingle();

  if (error) {
    log.database('SELECT event by id', 'event', error as any, { id });
  }

  if (data) {
    if (data.is_published === false) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isAdmin(user as any)) {
        return null;
      }
    }

    const eventId = String(data.id ?? id);
    const [featuresData, assistants, viewerRegistrationStatesByEventId] = await Promise.all([
      getEventFeaturesByEventId(supabase, eventId),
      getApprovedAssistantsByEventId(supabase, eventId),
      getViewerRegistrationStatesByEventIds([eventId], supabase),
    ]);
    const approvedCount = assistants.length;
    const maxUsers = Number((data as any)?.max_users ?? 0);
    const viewerRegistrationState = viewerRegistrationStatesByEventId.get(eventId) ?? null;
    return {
      ...data,
      featuresData,
      assistants,
      approvedCount,
      placesLeft: getPlacesLeft(maxUsers, approvedCount),
      isSoldOut: isEventSoldOut(maxUsers, approvedCount),
      viewerHasApprovedRegistration: viewerRegistrationState === 'approved',
      viewerHasPendingRegistration: viewerRegistrationState === 'pending',
    };
  }

  // Fallback al backend legacy para eventos que aún no están en Supabase.
  try {
    const res = await backendFetch(backendUrl(`/event/${encodeURIComponent(id)}`), { method: 'GET' });
    log.apiCall('GET', `/event/${id}`, res.status, { source: 'backend-fallback' });

    if (!res.ok) return null;
    const json = await res.json();
    return json?.event ? json : json ?? null;
  } catch (fallbackError) {
    log.error('Fallback fetch event by id failed', 'EVENT_DETAILS', fallbackError, { id });
    return null;
  }

}
