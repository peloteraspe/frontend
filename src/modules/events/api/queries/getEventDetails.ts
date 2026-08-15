import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { backendFetch, backendUrl } from '@core/api/backend';
import { log } from '@core/lib/logger';
import { getViewerRegistrationStatesByEventIds } from '@modules/events/api/queries/getViewerApprovedRegistrations';
import { getPlacesLeft, isEventSoldOut } from '@modules/events/lib/eventCapacity';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import { getEventCatalogs } from '@modules/events/api/queries/getEventCatalogs';
import { getEventTeamRegistrations } from '@modules/events/api/queries/getTeamEventRegistrations';
import { resolveEventRegistrationMode } from '@modules/events/lib/eventTypeRules';

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
  team_id: number | string | null;
};

type ProfileRow = {
  id: number | string;
  user: string | null;
  username: string | null;
};

type ProfilePositionRow = {
  profile_id: number | string;
  position_id: number | string;
};

type PlayerPositionRow = {
  id: number | string;
  name: string | null;
};

function resolveAvatarUrl(metadata: Record<string, unknown> | null | undefined) {
  const candidates = [
    metadata?.avatar,
    metadata?.avatar_url,
    metadata?.picture,
    metadata?.photoURL,
    metadata?.profile_image_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  return null;
}

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
  const adminSupabase = getAdminSupabase();
  const { data: assistantsData, error: assistantsError } = await adminSupabase
    .from('assistants')
    .select('id,user,state,team_id')
    .eq('event', eventId)
    .eq('state', 'approved')
    .order('id', { ascending: true });

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
  const profileIdByUserId = new Map<string, string>();
  const positionsByUserId = new Map<string, string[]>();
  const avatarByUserId = new Map<string, string>();
  const teamNameById = new Map<string, string>();
  if (userIds.length) {
    const profilesPromise = adminSupabase
      .from('profile')
      .select('id,user,username')
      .in('user', userIds as any);
    const avatarsPromise = (async () => {
      try {
        return await Promise.all(
          userIds.map(async (userId) => {
            const { data, error } = await adminSupabase.auth.admin.getUserById(userId);
            if (error) return { userId, avatarUrl: null };
            return {
              userId,
              avatarUrl: resolveAvatarUrl(
                data.user?.user_metadata as Record<string, unknown> | null
              ),
            };
          })
        );
      } catch (avatarError) {
        log.error('Could not load event participant avatars', 'EVENT_DETAILS', avatarError, {
          eventId,
        });
        return [];
      }
    })();
    const [{ data: profilesData, error: profilesError }, authProfiles] = await Promise.all([
      profilesPromise,
      avatarsPromise,
    ]);

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
        if (userId && profile.id != null) profileIdByUserId.set(userId, String(profile.id));
      });
    }

    authProfiles.forEach(({ userId, avatarUrl }) => {
      if (avatarUrl) avatarByUserId.set(userId, avatarUrl);
    });

    const profileIds = Array.from(new Set(profileIdByUserId.values()));
    if (profileIds.length > 0) {
      const { data: profilePositionsData, error: profilePositionsError } = await adminSupabase
        .from('profile_position')
        .select('profile_id,position_id')
        .in('profile_id', profileIds as any)
        .order('position_id', { ascending: true });

      if (profilePositionsError) {
        log.database(
          'SELECT profile positions for event lineup',
          'profile_position',
          profilePositionsError as any,
          { eventId, profileIds }
        );
      } else {
        const profilePositions = (profilePositionsData ?? []) as ProfilePositionRow[];
        const positionIds = Array.from(
          new Set(profilePositions.map((row) => String(row.position_id)).filter(Boolean))
        );
        const { data: playerPositionsData, error: playerPositionsError } = positionIds.length
          ? await adminSupabase
              .from('player_position')
              .select('id,name')
              .in('id', positionIds as any)
          : { data: [], error: null };

        if (playerPositionsError) {
          log.database(
            'SELECT player positions for event lineup',
            'player_position',
            playerPositionsError as any,
            { eventId, positionIds }
          );
        } else {
          const positionNameById = new Map<string, string>();
          ((playerPositionsData ?? []) as PlayerPositionRow[]).forEach((position) => {
            const positionName = normalizeText(position.name);
            if (positionName) positionNameById.set(String(position.id), positionName);
          });

          const userIdByProfileId = new Map(
            Array.from(profileIdByUserId.entries()).map(([userId, profileId]) => [profileId, userId])
          );
          profilePositions.forEach((profilePosition) => {
            const userId = userIdByProfileId.get(String(profilePosition.profile_id));
            const positionName = positionNameById.get(String(profilePosition.position_id));
            if (!userId || !positionName) return;
            const current = positionsByUserId.get(userId) ?? [];
            if (!current.includes(positionName)) current.push(positionName);
            positionsByUserId.set(userId, current);
          });
        }
      }
    }
  }

  const teamIds = Array.from(
    new Set(assistants.map((assistant) => String(assistant.team_id ?? '').trim()).filter(Boolean))
  );
  if (teamIds.length > 0) {
    const { data: teamsData, error: teamsError } = await supabase
      .from('team')
      .select('id,name')
      .in('id', teamIds as any);
    if (teamsError) {
      log.database('SELECT teams for event participants', 'team', teamsError as any, { eventId, teamIds });
    } else {
      (teamsData ?? []).forEach((team: any) => teamNameById.set(String(team.id), String(team.name || 'Equipo')));
    }
  }

  return assistants.map((assistant) => {
    const userId = normalizeText(assistant.user);
    const profileName = userId ? profileByUserId.get(userId) : '';
    const name = normalizeText(profileName, userId ? `Jugadora ${userId.slice(0, 6)}` : 'Participante');
    return {
      id: String(assistant.id),
      state: normalizeText(assistant.state),
      username: profileName || null,
      name,
      avatarUrl: userId ? avatarByUserId.get(userId) ?? null : null,
      positions: userId ? positionsByUserId.get(userId) ?? [] : [],
      teamId: assistant.team_id == null ? null : String(assistant.team_id),
      teamName: assistant.team_id == null ? null : teamNameById.get(String(assistant.team_id)) ?? null,
    };
  });
}

async function getViewerTeamContext(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      canRegisterTeam: false,
      hasActiveTeam: false,
      activeTeamIds: [] as number[],
      captainTeamIds: [] as number[],
    };
  }

  const { data, error } = await supabase
    .from('team_member')
    .select('team_id,role')
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (error) {
    log.database('SELECT viewer team memberships for event CTA', 'team_member', error as any, {
      userId: user.id,
    });
    return {
      canRegisterTeam: false,
      hasActiveTeam: false,
      activeTeamIds: [] as number[],
      captainTeamIds: [] as number[],
    };
  }

  const memberships = data ?? [];
  const activeTeamIds = memberships
    .map((membership: any) => Number(membership.team_id))
    .filter((teamId: number) => Number.isInteger(teamId) && teamId > 0);
  const captainTeamIds = memberships
    .filter((membership: any) => membership.role === 'captain')
    .map((membership: any) => Number(membership.team_id))
    .filter((teamId: number) => Number.isInteger(teamId) && teamId > 0);

  return {
    canRegisterTeam: captainTeamIds.length > 0,
    hasActiveTeam: memberships.length > 0,
    activeTeamIds,
    captainTeamIds,
  };
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
    const [
      featuresData,
      assistants,
      viewerRegistrationStatesByEventId,
      viewerTeamContext,
      teamRegistrations,
      catalogs,
    ] = await Promise.all([
      getEventFeaturesByEventId(supabase, eventId),
      getApprovedAssistantsByEventId(supabase, eventId),
      getViewerRegistrationStatesByEventIds([eventId], supabase),
      getViewerTeamContext(supabase),
      getEventTeamRegistrations(eventId),
      getEventCatalogs(),
    ]);
    const eventTypeName =
      catalogs.eventTypes.find((eventType) => Number(eventType.id) === Number((data as any).EventType))
        ?.name ?? 'Partido';
    const registrationMode = resolveEventRegistrationMode(
      (data as any).registration_mode,
      eventTypeName,
      (data as any).allows_team_registration === true
    );
    const isTeamOnly = registrationMode === 'team';
    const approvedCount = assistants.length;
    const maxUsers = Number((data as any)?.max_users ?? 0);
    const viewerTeamRegistration = teamRegistrations.find((registration) =>
      viewerTeamContext.activeTeamIds.includes(registration.teamId)
    );
    const viewerRegistrationState = isTeamOnly
      ? viewerTeamRegistration?.state ?? null
      : viewerRegistrationStatesByEventId.get(eventId) ?? null;
    const activeTeamRegistrationCount = teamRegistrations.length;
    const teamRegistrationMaxTeams = Math.max(
      2,
      Number((data as any).team_registration_max_teams ?? 2)
    );
    const approvedTeamRegistrationCount = teamRegistrations.filter(
      (registration) => registration.state === 'approved'
    ).length;
    const pendingTeamRegistrationCount = activeTeamRegistrationCount - approvedTeamRegistrationCount;
    return {
      ...data,
      eventTypeName,
      registrationMode,
      featuresData,
      assistants,
      teamRegistrations,
      approvedCount,
      activeTeamRegistrationCount,
      approvedTeamRegistrationCount,
      pendingTeamRegistrationCount,
      teamRegistrationMaxTeams,
      placesLeft: isTeamOnly
        ? Math.max(0, teamRegistrationMaxTeams - activeTeamRegistrationCount)
        : getPlacesLeft(maxUsers, approvedCount),
      isSoldOut: isTeamOnly
        ? activeTeamRegistrationCount >= teamRegistrationMaxTeams
        : isEventSoldOut(maxUsers, approvedCount),
      viewerHasApprovedRegistration: viewerRegistrationState === 'approved',
      viewerHasPendingRegistration: viewerRegistrationState === 'pending',
      viewerCanRegisterTeam: viewerTeamContext.canRegisterTeam,
      viewerHasActiveTeam: viewerTeamContext.hasActiveTeam,
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
