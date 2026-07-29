import 'server-only';

import { getAdminSupabase } from '@core/api/supabase.admin';
import type { PublicPlayerProfile, PublicPlayerTeam } from '@modules/users/model/types';
import { normalizePublicHandle } from '@shared/lib/publicProfilePaths';

type ProfileRow = {
  id: number;
  created_at: string;
  user: string | null;
  username: string;
  level_id: number | null;
};

type PositionRelationRow = {
  position:
    | { id: number; name: string }
    | Array<{ id: number; name: string }>
    | null;
};

type TeamMembershipRelationRow = {
  role: 'captain' | 'player';
  team:
    | {
        id: number;
        name: string;
        slug: string;
        avatar_url: string | null;
        is_active: boolean;
        deleted_at: string | null;
      }
    | Array<{
        id: number;
        name: string;
        slug: string;
        avatar_url: string | null;
        is_active: boolean;
        deleted_at: string | null;
      }>
    | null;
};

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

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

function normalizePosition(row: PositionRelationRow) {
  const position = Array.isArray(row.position) ? row.position[0] : row.position;
  if (!position) return null;

  return {
    id: Number(position.id),
    name: String(position.name || '').trim(),
  };
}

function normalizeTeamMembership(row: TeamMembershipRelationRow): PublicPlayerTeam | null {
  const team = Array.isArray(row.team) ? row.team[0] : row.team;
  if (!team || !team.is_active || team.deleted_at) return null;

  return {
    id: Number(team.id),
    name: String(team.name || '').trim(),
    slug: String(team.slug || '').trim(),
    avatar_url: team.avatar_url,
    role: row.role,
  };
}

export async function getPublicPlayerProfileByUsername(
  username: string
): Promise<PublicPlayerProfile | null> {
  const normalizedUsername = normalizePublicHandle(username);
  if (!normalizedUsername) return null;

  const supabase = getAdminSupabase();
  const { data: profile, error: profileError } = await supabase
    .from('profile')
    .select('id, created_at, user, username, level_id')
    .ilike('username', escapeLikePattern(normalizedUsername))
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile) return null;

  const playerProfile = profile as ProfileRow;
  if (playerProfile.username.trim().toLowerCase() !== normalizedUsername) return null;

  const [levelResult, positionsResult, membershipsResult, authResult] = await Promise.all([
    playerProfile.level_id
      ? supabase.from('level').select('name').eq('id', playerProfile.level_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('profile_position')
      .select('position:position_id (id, name)')
      .eq('profile_id', playerProfile.id),
    playerProfile.user
      ? supabase
          .from('team_member')
          .select(
            `
              role,
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
          .eq('user_id', playerProfile.user)
          .eq('status', 'active')
      : Promise.resolve({ data: [], error: null }),
    playerProfile.user
      ? supabase.auth.admin.getUserById(playerProfile.user)
      : Promise.resolve({ data: { user: null }, error: null }),
  ]);

  if (levelResult.error) throw new Error(levelResult.error.message);
  if (positionsResult.error) throw new Error(positionsResult.error.message);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);

  const positions = ((positionsResult.data ?? []) as unknown as PositionRelationRow[])
    .map(normalizePosition)
    .filter((position): position is NonNullable<typeof position> => Boolean(position?.name));

  const teams = ((membershipsResult.data ?? []) as unknown as TeamMembershipRelationRow[])
    .map(normalizeTeamMembership)
    .filter((team): team is PublicPlayerTeam => Boolean(team))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'captain' ? -1 : 1;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });

  return {
    username: playerProfile.username,
    avatar_url: resolveAvatarUrl(
      authResult.data.user?.user_metadata as Record<string, unknown> | null
    ),
    level: typeof levelResult.data?.name === 'string' ? levelResult.data.name.trim() : null,
    positions,
    member_since: playerProfile.created_at,
    teams,
  };
}
