import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';

const ACTIVE_TEAM_REGISTRATION_STATES = ['pending', 'approved'] as const;

function normalizeEventId(value: unknown) {
  return String(value ?? '').trim();
}

export type EventTeamRegistrationSummary = {
  id: string;
  teamId: number;
  teamName: string;
  teamSlug: string;
  teamAvatarUrl: string | null;
  state: 'pending' | 'approved';
  participantCount: number;
  createdAt: string | null;
};

export type EventTeamRegistrationCounts = {
  active: number;
  approved: number;
  pending: number;
};

export async function getTeamRegistrationCountsByEventIds(
  eventIds: Array<string | number>
) {
  const normalizedEventIds = Array.from(
    new Set(eventIds.map(normalizeEventId).filter(Boolean))
  );
  const countByEventId = new Map<string, EventTeamRegistrationCounts>();

  if (normalizedEventIds.length === 0) return countByEventId;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('team_event_registration')
    .select('event_id,state')
    .in('event_id', normalizedEventIds as any)
    .in('state', [...ACTIVE_TEAM_REGISTRATION_STATES]);

  if (error) {
    log.database('SELECT active team registration counts', 'team_event_registration', error, {
      eventIds: normalizedEventIds,
    });
    return countByEventId;
  }

  (data ?? []).forEach((registration: any) => {
    const eventId = normalizeEventId(registration.event_id);
    if (!eventId) return;
    const current = countByEventId.get(eventId) ?? { active: 0, approved: 0, pending: 0 };
    const isApproved = teamRegistrationState(registration.state) === 'approved';
    countByEventId.set(eventId, {
      active: current.active + 1,
      approved: current.approved + (isApproved ? 1 : 0),
      pending: current.pending + (isApproved ? 0 : 1),
    });
  });

  return countByEventId;
}

function teamRegistrationState(value: unknown): 'pending' | 'approved' {
  return value === 'approved' ? 'approved' : 'pending';
}

export async function getActiveTeamRegistrationCountsByEventIds(
  eventIds: Array<string | number>
) {
  const countsByEventId = await getTeamRegistrationCountsByEventIds(eventIds);
  return new Map(
    Array.from(countsByEventId.entries()).map(([eventId, counts]) => [eventId, counts.active])
  );
}

export async function getEventTeamRegistrations(
  eventId: string | number
): Promise<EventTeamRegistrationSummary[]> {
  const normalizedEventId = normalizeEventId(eventId);
  if (!normalizedEventId) return [];

  const admin = getAdminSupabase();
  const { data: registrations, error: registrationsError } = await admin
    .from('team_event_registration')
    .select('id,team_id,state,participant_count,created_at')
    .eq('event_id', normalizedEventId)
    .in('state', [...ACTIVE_TEAM_REGISTRATION_STATES])
    .order('created_at', { ascending: true });

  if (registrationsError) {
    log.database('SELECT event team registrations', 'team_event_registration', registrationsError, {
      eventId: normalizedEventId,
    });
    return [];
  }

  const teamIds = Array.from(
    new Set(
      (registrations ?? [])
        .map((registration: any) => Number(registration.team_id))
        .filter((teamId) => Number.isInteger(teamId) && teamId > 0)
    )
  );

  if (teamIds.length === 0) return [];

  const { data: teams, error: teamsError } = await admin
    .from('team')
    .select('id,name,slug,avatar_url')
    .in('id', teamIds);

  if (teamsError) {
    log.database('SELECT registered teams for event', 'team', teamsError, {
      eventId: normalizedEventId,
      teamIds,
    });
    return [];
  }

  const teamById = new Map((teams ?? []).map((team: any) => [Number(team.id), team]));

  return (registrations ?? []).flatMap((registration: any) => {
    const teamId = Number(registration.team_id);
    const team = teamById.get(teamId);
    if (!team) return [];

    return [
      {
        id: String(registration.id),
        teamId,
        teamName: String(team.name || 'Equipo'),
        teamSlug: String(team.slug || ''),
        teamAvatarUrl: typeof team.avatar_url === 'string' ? team.avatar_url : null,
        state: registration.state === 'approved' ? 'approved' : 'pending',
        participantCount: Number(registration.participant_count || 0),
        createdAt: typeof registration.created_at === 'string' ? registration.created_at : null,
      },
    ];
  });
}

export async function getViewerTeamRegistrationStatesByEventIds(
  eventIds: Array<string | number>,
  supabaseClient: any
) {
  const stateByEventId = new Map<string, 'pending' | 'approved'>();
  const normalizedEventIds = Array.from(
    new Set(eventIds.map(normalizeEventId).filter(Boolean))
  );
  if (normalizedEventIds.length === 0) return stateByEventId;

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return stateByEventId;

  const { data: memberships, error: membershipsError } = await supabaseClient
    .from('team_member')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (membershipsError) {
    log.database('SELECT viewer active teams for events', 'team_member', membershipsError, {
      userId: user.id,
    });
    return stateByEventId;
  }

  const teamIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((membership: any) => Number(membership.team_id))
        .filter((teamId) => Number.isInteger(teamId) && teamId > 0)
    )
  );
  if (teamIds.length === 0) return stateByEventId;

  const admin = getAdminSupabase();
  const { data: registrations, error: registrationsError } = await admin
    .from('team_event_registration')
    .select('event_id,state')
    .in('event_id', normalizedEventIds as any)
    .in('team_id', teamIds)
    .in('state', [...ACTIVE_TEAM_REGISTRATION_STATES]);

  if (registrationsError) {
    log.database(
      'SELECT viewer team registration states',
      'team_event_registration',
      registrationsError,
      { userId: user.id, eventIds: normalizedEventIds, teamIds }
    );
    return stateByEventId;
  }

  (registrations ?? []).forEach((registration: any) => {
    const eventId = normalizeEventId(registration.event_id);
    if (!eventId) return;
    const state = registration.state === 'approved' ? 'approved' : 'pending';
    if (state === 'approved' || !stateByEventId.has(eventId)) {
      stateByEventId.set(eventId, state);
    }
  });

  return stateByEventId;
}
