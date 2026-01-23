// src/modules/teams/api/services/teams.service.ts
import { getServerSupabase } from '@src/core/api/supabase.server';
import { cookies } from 'next/headers';

export async function getSupabase() {
  return await getServerSupabase();
}

export async function createTeamRecord(name: string, ownerId: string, imageUrl: string | null) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('teams')
    .insert({ name, owner_id: ownerId, image_url: imageUrl })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message || 'Team creation failed');
  return data.id as string;
}

export async function upsertTeamMembers(teamId: string, ownerId: string, memberIds: string[]) {
  const supabase = await getSupabase();
  const rows = memberIds.map((uid) => ({
    team_id: teamId,
    user_id: uid,
    role: uid === ownerId ? 'OWNER' : 'PLAYER',
  }));
  const { error } = await supabase.from('team_members').upsert(rows, {
    onConflict: 'team_id,user_id',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);
}

export async function insertInvites(teamId: string, invitedBy: string, emails: string[]) {
  if (!emails.length) return;
  const supabase = await getSupabase();
  const rows = emails.map((email) => ({
    team_id: teamId,
    email,
    status: 'PENDING',
    invited_by: invitedBy,
  }));
  const { error } = await supabase.from('team_invites').insert(rows);
  if (error) throw new Error(error.message);
}

export async function rollbackTeamCascade(teamId: string) {
  const supabase = await getSupabase();
  await supabase.from('team_invites').delete().eq('team_id', teamId);
  await supabase.from('team_members').delete().eq('team_id', teamId);
  await supabase.from('teams').delete().eq('id', teamId);
}
