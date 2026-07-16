import { getServerSupabase } from '@src/core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import type {
  CreateTeamInvitationInput,
  PublicTeamMember,
  PublicTeamProfile,
  TeamInvitationRow,
  TeamInvitationSummary,
  TeamMemberRole,
  TeamRow,
} from '@modules/teams/model/types';

export async function getSupabase() {
  return await getServerSupabase();
}

export async function createTeamWithCaptain(
  name: string,
  avatarUrl: string | null,
  instagramUsername: string | null,
  tiktokUsername: string | null,
  ownerId: string,
  idempotencyKey: string | null = null
) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .rpc('create_team_with_captain', {
      p_name: name,
      p_avatar_url: avatarUrl,
      p_instagram_username: instagramUsername,
      p_tiktok_username: tiktokUsername,
      p_idempotency_key: idempotencyKey,
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
        deleted_at
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

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
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
  const normalizedSlug = normalizeSlug(slug);
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
        deleted_at
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

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profile')
      .select('user, username')
      .in('user', userIds);

    if (profilesError) throw new Error(profilesError.message);

    ((profiles ?? []) as ProfilePublicRow[]).forEach((profile) => {
      if (profile.user && profile.username) {
        profileByUserId.set(profile.user, profile.username);
      }
    });
  }

  const publicMembers: PublicTeamMember[] = members
    .map((member) => ({
      id: member.id,
      username: profileByUserId.get(member.user_id) ?? null,
      role: member.role,
      joined_at: member.joined_at,
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'captain' ? -1 : 1;
      return (a.username ?? '').localeCompare(b.username ?? '');
    });

  return {
    team: mapPublicTeam(team as TeamRow),
    members: publicMembers,
  };
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
        status,
        invitation_token,
        metadata,
        created_at,
        updated_at,
        expires_at,
        responded_at,
        cancelled_at,
        accepted_member_id
      `
    )
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TeamInvitationRow[];
}

export async function listViewerTeamInvitations(): Promise<TeamInvitationSummary[]> {
  const supabase = await getSupabase();
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
        status,
        invitation_token,
        metadata,
        created_at,
        updated_at,
        expires_at,
        responded_at,
        cancelled_at,
        accepted_member_id,
        team:team_id (
          id,
          name,
          slug,
          avatar_url
        )
      `
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as TeamInvitationWithTeamRow[]).map(normalizeInvitationSummary);
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
        status,
        invitation_token,
        metadata,
        created_at,
        updated_at,
        expires_at,
        responded_at,
        cancelled_at,
        accepted_member_id,
        team:team_id (
          id,
          name,
          slug,
          avatar_url
        )
      `
    )
    .eq('invitation_token', normalizedToken)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data
    ? normalizeInvitationSummary(data as unknown as TeamInvitationWithTeamRow)
    : null;
}
