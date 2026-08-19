import { getServerSupabase } from '@src/core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import type {
  CreateTeamInvitationInput,
  CaptainTeamInvitationCard,
  PublicTeamMember,
  PublicTeamProfile,
  TeamInvitationRow,
  TeamInvitationCard,
  TeamInvitationSummary,
  TeamInvitationLinkPreview,
  TeamEventSummary,
  TeamMemberRole,
  TeamRow,
} from '@modules/teams/model/types';
import { normalizePublicHandle } from '@shared/lib/publicProfilePaths';

export async function getSupabase() {
  return await getServerSupabase();
}

export async function createTeamWithCaptain(
  name: string,
  avatarUrl: string | null,
  instagramUsername: string | null,
  tiktokUsername: string | null,
  ownerId: string,
  idempotencyKey: string | null = null,
  maxMembers = 20
) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .rpc('create_team_with_captain', {
      p_name: name,
      p_avatar_url: avatarUrl,
      p_instagram_username: instagramUsername,
      p_tiktok_username: tiktokUsername,
      p_idempotency_key: idempotencyKey,
      p_max_members: maxMembers,
    })
    .single();

  if (error && isMissingIdempotencyRpcSignature(error.message)) {
    const fallback = await supabase
      .rpc('create_team_with_captain', {
        p_name: name,
        p_avatar_url: avatarUrl,
        p_instagram_username: instagramUsername,
        p_tiktok_username: tiktokUsername,
      })
      .single();

    if (fallback.error || !fallback.data) {
      if (isMissingTeamCreationRpc(fallback.error?.message)) {
        return createTeamWithCaptainDirectly({
          name,
          avatarUrl,
          instagramUsername,
          tiktokUsername,
          ownerId,
          maxMembers,
        });
      }

      throw new Error(fallback.error?.message || 'Team creation failed');
    }

    return fallback.data as TeamRow;
  }

  if (error && isMissingTeamCreationRpc(error.message)) {
    return createTeamWithCaptainDirectly({
      name,
      avatarUrl,
      instagramUsername,
      tiktokUsername,
      ownerId,
      maxMembers,
    });
  }

  if (error || !data) throw new Error(error?.message || 'Team creation failed');
  return data as TeamRow;
}

function isMissingIdempotencyRpcSignature(message: string | undefined) {
  const normalized = String(message ?? '').toLowerCase();
  return (
    normalized.includes('create_team_with_captain') &&
    (normalized.includes('p_idempotency_key') ||
      normalized.includes('schema cache') ||
      normalized.includes('could not find the function'))
  );
}

function isMissingTeamCreationRpc(message: string | undefined) {
  const normalized = String(message ?? '').toLowerCase();
  return (
    normalized.includes('create_team_with_captain') &&
    (normalized.includes('schema cache') || normalized.includes('could not find the function'))
  );
}

type CreateTeamDirectInput = {
  name: string;
  avatarUrl: string | null;
  instagramUsername: string | null;
  tiktokUsername: string | null;
  ownerId: string;
  maxMembers: number;
};

const RESERVED_TEAM_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'check-in',
  'contactanos',
  'convocatorias',
  'create-event',
  'events',
  'login',
  'payments',
  'profile',
  'registro-jugadoras',
  'signup',
  'support',
  'tickets',
]);

function normalizeTeamSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'equipo';
}

async function generateUniqueTeamSlug(name: string) {
  const supabase = getAdminSupabase();
  const baseSlug = normalizeTeamSlug(name);

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    if (RESERVED_TEAM_SLUGS.has(candidate)) continue;

    const { data, error } = await supabase
      .from('team')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return candidate;
  }

  return `${baseSlug}-${Math.floor(Date.now() / 1000)}`;
}

async function createTeamWithCaptainDirectly(input: CreateTeamDirectInput) {
  const supabase = getAdminSupabase();
  const slug = await generateUniqueTeamSlug(input.name);
  const { data: team, error: teamError } = await supabase
    .from('team')
    .insert({
      name: input.name,
      slug,
      avatar_url: input.avatarUrl,
      instagram_username: input.instagramUsername,
      tiktok_username: input.tiktokUsername,
      created_by_user_id: input.ownerId,
      max_members: input.maxMembers,
    })
    .select(
      `
        id,
        created_at,
        updated_at,
        name,
        slug,
        avatar_url,
        instagram_username,
        tiktok_username,
        created_by_user_id,
        invitation_token,
        is_active,
        deleted_at,
        max_members
      `
    )
    .single();

  if (teamError || !team) {
    throw new Error(teamError?.message || 'Team creation failed');
  }

  const { error: memberError } = await supabase.from('team_member').insert({
    team_id: team.id,
    user_id: input.ownerId,
    role: 'captain',
    status: 'active',
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    await supabase.from('team').delete().eq('id', team.id);
    throw new Error(memberError.message);
  }

  return team as TeamRow;
}

type PublicTeamRow = Omit<TeamRow, 'invitation_token' | 'created_by_user_id' | 'deleted_at'>;

type TeamMemberPublicRow = {
  id: number;
  user_id: string;
  role: TeamMemberRole;
  joined_at: string | null;
};

type ProfilePublicRow = {
  user: string | null;
  username: string | null;
};

type TeamInvitationWithTeamRow = TeamInvitationRow & {
  team:
    | Pick<TeamRow, 'id' | 'name' | 'slug' | 'avatar_url'>
    | Pick<TeamRow, 'id' | 'name' | 'slug' | 'avatar_url'>[]
    | null;
};

type TeamInvitationTokenRow = Omit<TeamInvitationWithTeamRow, 'team'> & {
  team:
    | Pick<TeamRow, 'id' | 'name' | 'slug' | 'avatar_url' | 'is_active' | 'deleted_at'>
    | Pick<TeamRow, 'id' | 'name' | 'slug' | 'avatar_url' | 'is_active' | 'deleted_at'>[]
    | null;
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

function mapPublicTeam(row: TeamRow): PublicTeamRow {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: row.name,
    slug: row.slug,
    avatar_url: row.avatar_url,
    instagram_username: row.instagram_username,
    tiktok_username: row.tiktok_username,
    is_active: row.is_active,
    max_members: row.max_members,
  };
}

function normalizeInvitationSummary(row: TeamInvitationWithTeamRow): TeamInvitationSummary {
  const team = Array.isArray(row.team) ? row.team[0] : row.team;
  return {
    ...row,
    team: team ?? null,
  };
}

export async function getPublicTeamProfileBySlug(
  slug: string
): Promise<PublicTeamProfile | null> {
  const normalizedSlug = normalizePublicHandle(slug);
  if (!normalizedSlug) return null;

  const supabase = getAdminSupabase();
  const { data: team, error: teamError } = await supabase
    .from('team')
    .select(
      `
        id,
        created_at,
        updated_at,
        name,
        slug,
        avatar_url,
        instagram_username,
        tiktok_username,
        created_by_user_id,
        invitation_token,
        is_active,
        deleted_at,
        max_members
      `
    )
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (teamError) throw new Error(teamError.message);
  if (!team) return null;

  const { data: memberRows, error: membersError } = await supabase
    .from('team_member')
    .select('id, user_id, role, joined_at')
    .eq('team_id', team.id)
    .eq('status', 'active')
    .order('role', { ascending: true })
    .order('joined_at', { ascending: true });

  if (membersError) throw new Error(membersError.message);

  const members = (memberRows ?? []) as TeamMemberPublicRow[];
  const userIds = members.map((member) => member.user_id).filter(Boolean);
  const profileByUserId = new Map<string, string>();
  const avatarByUserId = new Map<string, string>();

  if (userIds.length > 0) {
    const [{ data: profiles, error: profilesError }, authProfiles] = await Promise.all([
      supabase.from('profile').select('user, username').in('user', userIds),
      Promise.all(
        userIds.map(async (userId) => {
          const { data } = await supabase.auth.admin.getUserById(userId);
          return {
            userId,
            avatarUrl: resolveAvatarUrl(data.user?.user_metadata as Record<string, unknown> | null),
          };
        })
      ),
    ]);

    if (profilesError) throw new Error(profilesError.message);

    ((profiles ?? []) as ProfilePublicRow[]).forEach((profile) => {
      if (profile.user && profile.username) {
        profileByUserId.set(profile.user, profile.username);
      }
    });

    authProfiles.forEach(({ userId, avatarUrl }) => {
      if (avatarUrl) avatarByUserId.set(userId, avatarUrl);
    });
  }

  const publicMembers: PublicTeamMember[] = members
    .map((member) => ({
      id: member.id,
      username: profileByUserId.get(member.user_id) ?? null,
      avatar_url: avatarByUserId.get(member.user_id) ?? null,
      role: member.role,
      joined_at: member.joined_at,
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'captain' ? -1 : 1;
      return (a.username ?? '').localeCompare(b.username ?? '');
    });

  const { data: registrationRows, error: registrationsError } = await supabase
    .from('team_event_registration')
    .select('id,event_id,participant_count')
    .eq('team_id', team.id)
    .eq('state', 'approved')
    .order('created_at', { ascending: false });

  if (registrationsError) throw new Error(registrationsError.message);

  const eventIds = Array.from(
    new Set((registrationRows ?? []).map((row) => Number(row.event_id)).filter(Number.isFinite))
  );
  const eventById = new Map<number, TeamEventSummary['event']>();

  if (eventIds.length > 0) {
    const { data: eventRows, error: eventsError } = await supabase
      .from('event')
      .select('id,title,start_time,end_time,location_text')
      .in('id', eventIds);
    if (eventsError) throw new Error(eventsError.message);

    (eventRows ?? []).forEach((event) => {
      eventById.set(Number(event.id), {
        id: Number(event.id),
        title: String(event.title || 'Evento'),
        startTime: event.start_time ?? null,
        endTime: event.end_time ?? null,
        locationText: event.location_text ?? null,
      });
    });
  }

  const teamEvents: TeamEventSummary[] = (registrationRows ?? []).flatMap((registration) => {
    const event = eventById.get(Number(registration.event_id));
    if (!event) return [];
    return [{
      registrationId: Number(registration.id),
      state: 'approved' as const,
      participantCount: Number(registration.participant_count || 0),
      event,
    }];
  });

  return {
    team: mapPublicTeam(team as TeamRow),
    members: publicMembers,
    events: teamEvents,
  };
}

export async function getViewerActiveTeamRole(
  teamId: number
): Promise<TeamMemberRole | null> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('team_member')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.role as TeamMemberRole | undefined) ?? null;
}

export async function getViewerFeaturedTeamId(): Promise<number | null> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profile')
    .select('featured_team_id')
    .eq('user', user.id)
    .limit(1);
  if (error) throw new Error(error.message);
  const id = Number(data?.[0]?.featured_team_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function createTeamInvitation(
  input: CreateTeamInvitationInput
): Promise<TeamInvitationRow> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .rpc('create_team_invitation', {
      p_team_id: input.teamId,
      p_delivery_method: input.deliveryMethod,
      p_invitee_user_id: input.inviteeUserId ?? null,
      p_invitee_email: input.inviteeEmail ?? null,
      p_invitee_username: input.inviteeUsername ?? null,
      p_expires_at: input.expiresAt ?? null,
      p_metadata: input.metadata ?? {},
    })
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Team invitation creation failed');
  }

  return data as TeamInvitationRow;
}

export async function listTeamInvitationsForCaptain(
  teamId: number
): Promise<TeamInvitationRow[]> {
  const supabase = await getSupabase();
  const { error: expirationError } = await supabase.rpc('expire_visible_team_invitations', {
    p_team_id: teamId,
  });
  if (expirationError) throw new Error(expirationError.message);

  const { data, error } = await supabase
    .from('team_invitation')
    .select(
      `
        id,
        team_id,
        invited_by_user_id,
        invitee_user_id,
        invitee_email,
        invitee_username,
        delivery_method,
        source,
        status,
        invitation_token,
        metadata,
        created_at,
        updated_at,
        expires_at,
        responded_at,
        cancelled_at,
        email_sent_at,
        email_delivery_status,
        provider_message_id,
        accepted_member_id
      `
    )
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as TeamInvitationRow[];
}

function maskInvitationEmail(value: string | null) {
  if (!value) return null;
  const [localPart, domain] = value.split('@');
  if (!localPart || !domain) return null;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${'*'.repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
}

export async function listCaptainTeamInvitationCards(
  teamId: number
): Promise<CaptainTeamInvitationCard[]> {
  const invitations = await listTeamInvitationsForCaptain(teamId);
  return invitations.map((invitation) => ({
    id: invitation.id,
    username: invitation.invitee_username,
    maskedEmail: maskInvitationEmail(invitation.invitee_email),
    status: invitation.status,
    emailDeliveryStatus: invitation.email_delivery_status,
    createdAt: invitation.created_at,
    respondedAt: invitation.responded_at,
    cancelledAt: invitation.cancelled_at,
  }));
}

export async function listViewerTeamInvitations(): Promise<TeamInvitationSummary[]> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { error: expirationError } = await supabase.rpc('expire_visible_team_invitations', {
    p_team_id: null,
  });
  if (expirationError) throw new Error(expirationError.message);

  const { data, error } = await supabase
    .from('team_invitation')
    .select(
      `
        id,
        team_id,
        invited_by_user_id,
        invitee_user_id,
        invitee_email,
        invitee_username,
        delivery_method,
        source,
        status,
        invitation_token,
        metadata,
        created_at,
        updated_at,
        expires_at,
        responded_at,
        cancelled_at,
        email_sent_at,
        email_delivery_status,
        provider_message_id,
        accepted_member_id,
        team:team_id (
          id,
          name,
          slug,
          avatar_url
        )
      `
    )
    // Captains can read their team's invitations through RLS for management,
    // but this query feeds the invitee's personal Convocatorias inbox.
    .eq('invitee_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as TeamInvitationWithTeamRow[]).map(normalizeInvitationSummary);
}

export async function listViewerTeamInvitationCards(): Promise<TeamInvitationCard[]> {
  const invitations = await listViewerTeamInvitations();
  const captainIds = Array.from(
    new Set(invitations.map((invitation) => invitation.invited_by_user_id))
  );
  const supabase = await getSupabase();
  const captainUsernameById = new Map<string, string>();

  if (captainIds.length > 0) {
    const { data, error } = await supabase
      .from('profile')
      .select('user, username')
      .in('user', captainIds);
    if (error) throw new Error(error.message);

    ((data ?? []) as ProfilePublicRow[]).forEach((profile) => {
      if (profile.user && profile.username) {
        captainUsernameById.set(profile.user, profile.username);
      }
    });
  }

  return invitations.flatMap((invitation) => {
    if (!invitation.team) return [];
    return [
      {
        id: invitation.id,
        status: invitation.status,
        createdAt: invitation.created_at,
        updatedAt: invitation.updated_at,
        expiresAt: invitation.expires_at,
        respondedAt: invitation.responded_at,
        captainUsername:
          captainUsernameById.get(invitation.invited_by_user_id) ?? null,
        team: invitation.team,
      },
    ];
  });
}

export async function getTeamInvitationByToken(
  token: string
): Promise<TeamInvitationSummary | null> {
  const normalizedToken = token.trim();
  if (!normalizedToken) return null;

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('team_invitation')
    .select(
      `
        id,
        team_id,
        invited_by_user_id,
        invitee_user_id,
        invitee_email,
        invitee_username,
        delivery_method,
        source,
        status,
        invitation_token,
        metadata,
        created_at,
        updated_at,
        expires_at,
        responded_at,
        cancelled_at,
        email_sent_at,
        email_delivery_status,
        provider_message_id,
        accepted_member_id,
        team:team_id (
          id,
          name,
          slug,
          avatar_url,
          is_active,
          deleted_at
        )
      `
    )
    .eq('invitation_token', normalizedToken)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const tokenRow = data as unknown as TeamInvitationTokenRow;
  const tokenTeam = Array.isArray(tokenRow.team) ? tokenRow.team[0] : tokenRow.team;
  if (!tokenTeam?.is_active || tokenTeam.deleted_at) return null;

  return normalizeInvitationSummary({
    ...tokenRow,
    team: {
      id: tokenTeam.id,
      name: tokenTeam.name,
      slug: tokenTeam.slug,
      avatar_url: tokenTeam.avatar_url,
    },
  });
}

export async function claimTeamInvitationByToken(
  token: string
): Promise<TeamInvitationRow> {
  const normalizedToken = token.trim();
  if (!normalizedToken) throw new Error('Invitation token is required');

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .rpc('claim_team_invitation_by_token', {
      p_token: normalizedToken,
    })
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Team invitation claim failed');
  }

  return data as TeamInvitationRow;
}

export async function respondToTeamInvitation(
  invitationId: number,
  response: 'accepted' | 'rejected'
): Promise<TeamInvitationRow> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .rpc('respond_to_team_invitation', {
      p_invitation_id: invitationId,
      p_response: response,
    })
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Team invitation response failed');
  }

  return data as TeamInvitationRow;
}

export async function cancelTeamInvitation(
  invitationId: number
): Promise<TeamInvitationRow> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .rpc('cancel_team_invitation', {
      p_invitation_id: invitationId,
    })
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Team invitation cancellation failed');
  }

  return data as TeamInvitationRow;
}

export async function getTeamInvitationLinkPreview(
  token: string
): Promise<TeamInvitationLinkPreview | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .rpc('get_team_invitation_link_preview', { p_token: token })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const preview = data as {
    team_id: number;
    team_name: string;
    team_slug: string;
    team_avatar_url: string | null;
  };
  return {
    teamId: Number(preview.team_id),
    teamName: preview.team_name,
    teamSlug: preview.team_slug,
    teamAvatarUrl: preview.team_avatar_url ?? null,
  };
}

export async function resolveTeamLinkInvitation(
  token: string
): Promise<TeamInvitationRow> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .rpc('resolve_team_link_invitation', { p_token: token })
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Team invitation link resolution failed');
  }
  return data as TeamInvitationRow;
}
