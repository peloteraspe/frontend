// src/modules/teams/api/handlers/teams.list.ts
import { NextResponse } from 'next/server';
import { HTTP_401, jsonNoStore } from '@core/api/responses';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { getCurrentUserId } from '@core/auth/supabase-user';
import type {
  TeamMembershipSummary,
  TeamMemberRole,
  TeamMemberStatus,
  TeamSummaryRow,
} from '@modules/teams/model/types';

type TeamMemberWithTeam = {
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joined_at: string | null;
  team: TeamSummaryRow | TeamSummaryRow[] | null;
};

function isMissingTeamMemberTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { code?: unknown; message?: unknown };
  const message = String(candidate.message ?? '').toLowerCase();

  return (
    candidate.code === 'PGRST205' ||
    (message.includes('team_member') &&
      (message.includes('schema cache') || message.includes('does not exist')))
  );
}

function normalizeMembership(row: TeamMemberWithTeam): TeamMembershipSummary | null {
  const team = Array.isArray(row.team) ? row.team[0] : row.team;
  if (!team) return null;

  return {
    role: row.role,
    status: row.status,
    joined_at: row.joined_at,
    team,
  };
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return HTTP_401;

    const supabase = getAdminSupabase();
    const [{ data, error }, { data: profileRows, error: profileError }] = await Promise.all([
      supabase
      .from('team_member')
      .select(
        `
          role,
          status,
          joined_at,
          team:team_id (
            id,
            created_at,
            updated_at,
            name,
            slug,
            avatar_url,
            instagram_username,
            tiktok_username,
            is_active,
            deleted_at,
            max_members
          )
        `
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('team.is_active', true)
      .is('team.deleted_at', null)
      .order('joined_at', { ascending: false }),
      supabase.from('profile').select('featured_team_id').eq('user', userId).limit(1),
    ]);

    if (error) {
      if (isMissingTeamMemberTableError(error)) {
        console.warn('GET /api/teams skipped because public.team_member is missing.');
        return jsonNoStore({ teams: [] });
      }

      console.error('GET /api/teams failed:', error);
      return NextResponse.json({ error: 'No se pudieron cargar tus equipos.' }, { status: 500 });
    }

    if (profileError) {
      console.error('GET /api/teams featured team failed:', profileError);
    }
    const featuredTeamId = Number(profileRows?.[0]?.featured_team_id);
    const memberships = ((data ?? []) as TeamMemberWithTeam[])
      .map(normalizeMembership)
      .filter(Boolean)
      .map((membership) => ({
        ...membership!,
        isFeatured: membership!.team.id === featuredTeamId,
      })) as TeamMembershipSummary[];

    return jsonNoStore({ teams: memberships });
  } catch (err) {
    console.error('GET /api/teams failed:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
