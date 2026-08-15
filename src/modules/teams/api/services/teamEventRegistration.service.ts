import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { getActiveLinkedPaymentMethodIdsForEvent } from '@shared/lib/paymentMethodSelection.server';
import { hasCompleteEventProfile } from '@modules/users/lib/eventProfileRequirements';
import { getActiveTeamRegistrationCountsByEventIds } from '@modules/events/api/queries/getTeamEventRegistrations';

export const TEAM_REGISTRATION_AUTH_REQUIRED = 'TEAM_REGISTRATION_AUTH_REQUIRED';
export const TEAM_REGISTRATION_PROFILE_REQUIRED = 'TEAM_REGISTRATION_PROFILE_REQUIRED';
export const TEAM_REGISTRATION_NOT_AVAILABLE = 'TEAM_REGISTRATION_NOT_AVAILABLE';

export type CaptainTeamRegistrationOption = {
  id: number;
  name: string;
  slug: string;
  avatarUrl: string | null;
  existingRegistrationId: number | null;
  existingState: 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
  members: Array<{
    membershipId: number;
    userId: string;
    username: string;
    role: 'captain' | 'player';
  }>;
};

export async function getTeamRegistrationPageData(eventId: string) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error(TEAM_REGISTRATION_AUTH_REQUIRED);
  if (!hasCompleteEventProfile(user)) throw new Error(TEAM_REGISTRATION_PROFILE_REQUIRED);

  const admin = getAdminSupabase();
  const { data: event, error: eventError } = await admin
    .from('event')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();
  if (eventError || !event || event.is_published === false || !event.allows_team_registration) {
    throw new Error(TEAM_REGISTRATION_NOT_AVAILABLE);
  }

  const endTime = event.end_time || event.start_time;
  if (endTime && new Date(endTime).getTime() <= Date.now()) {
    throw new Error(TEAM_REGISTRATION_NOT_AVAILABLE);
  }

  const { data: captainRows, error: captainError } = await admin
    .from('team_member')
    .select('team_id,team:team_id(id,name,slug,avatar_url,is_active,deleted_at)')
    .eq('user_id', user.id)
    .eq('role', 'captain')
    .eq('status', 'active');
  if (captainError) throw new Error(captainError.message);

  const { count: activeMembershipCount, error: activeMembershipError } = await admin
    .from('team_member')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (activeMembershipError) throw new Error(activeMembershipError.message);

  const teams = (captainRows ?? []).flatMap((row: any) => {
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    if (!team?.is_active || team.deleted_at) return [];
    return [team];
  });
  const teamIds = teams.map((team: any) => Number(team.id));

  const [{ data: memberRows, error: memberError }, { data: registrationRows, error: registrationError }] =
    teamIds.length > 0
      ? await Promise.all([
          admin
            .from('team_member')
            .select('id,team_id,user_id,role')
            .in('team_id', teamIds)
            .eq('status', 'active')
            .order('role', { ascending: true })
            .order('joined_at', { ascending: true }),
          admin
            .from('team_event_registration')
            .select('id,team_id,state')
            .eq('event_id', eventId)
            .in('team_id', teamIds)
            .order('created_at', { ascending: false }),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
  if (memberError) throw new Error(memberError.message);
  if (registrationError) throw new Error(registrationError.message);

  const userIds = Array.from(new Set((memberRows ?? []).map((row: any) => String(row.user_id))));
  const usernameByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await admin
      .from('profile')
      .select('user,username')
      .in('user', userIds);
    if (profileError) throw new Error(profileError.message);
    (profiles ?? []).forEach((profile: any) => {
      usernameByUserId.set(String(profile.user), String(profile.username || 'Jugadora'));
    });
  }

  const existingStateByTeamId = new Map<number, CaptainTeamRegistrationOption['existingState']>();
  const existingRegistrationIdByTeamId = new Map<number, number>();
  (registrationRows ?? []).forEach((row: any) => {
    const teamId = Number(row.team_id);
    const nextState = row.state as CaptainTeamRegistrationOption['existingState'];
    const currentState = existingStateByTeamId.get(teamId);
    const nextIsActive = nextState === 'pending' || nextState === 'approved';
    const currentIsActive = currentState === 'pending' || currentState === 'approved';
    if (!currentState || (nextIsActive && !currentIsActive)) {
      existingStateByTeamId.set(teamId, row.state as CaptainTeamRegistrationOption['existingState']);
      existingRegistrationIdByTeamId.set(teamId, Number(row.id));
    }
  });

  const teamOptions: CaptainTeamRegistrationOption[] = teams.map((team: any) => ({
    id: Number(team.id),
    name: String(team.name),
    slug: String(team.slug),
    avatarUrl: team.avatar_url ?? null,
    existingRegistrationId: existingRegistrationIdByTeamId.get(Number(team.id)) ?? null,
    existingState: existingStateByTeamId.get(Number(team.id)) ?? null,
    members: (memberRows ?? [])
      .filter((member: any) => Number(member.team_id) === Number(team.id))
      .map((member: any) => ({
        membershipId: Number(member.id),
        userId: String(member.user_id),
        username: usernameByUserId.get(String(member.user_id)) || 'Jugadora',
        role: member.role === 'captain' ? 'captain' : 'player',
      })),
  }));

  const paymentMethodIds = await getActiveLinkedPaymentMethodIdsForEvent(supabase, event.id);
  const { data: paymentMethods, error: paymentError } = paymentMethodIds.length > 0
    ? await admin.from('paymentMethod').select('id,name,QR,number,type').in('id', paymentMethodIds)
    : { data: [], error: null };
  if (paymentError) throw new Error(paymentError.message);
  const byId = new Map((paymentMethods ?? []).map((method: any) => [Number(method.id), method]));
  const activeTeamRegistrationCountByEventId =
    await getActiveTeamRegistrationCountsByEventIds([event.id]);
  const activeTeamRegistrationCount =
    activeTeamRegistrationCountByEventId.get(String(event.id)) ?? 0;
  const teamRegistrationMaxTeams = Math.max(2, Number(event.team_registration_max_teams ?? 2));

  return {
    event: {
      ...event,
      activeTeamRegistrationCount,
      teamRegistrationMaxTeams,
      isVersusFull:
        event.registration_mode === 'team' &&
        activeTeamRegistrationCount >= teamRegistrationMaxTeams,
      viewerHasActiveTeam: Number(activeMembershipCount || 0) > 0,
    },
    teams: teamOptions,
    paymentMethods: paymentMethodIds.map((id) => byId.get(id)).filter(Boolean),
    user,
  };
}
