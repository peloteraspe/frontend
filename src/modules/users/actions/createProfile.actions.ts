'use server';

import { createProfile } from '@modules/users/api/profile.server';
import { getServerSupabase } from '@core/api/supabase.server';

export type CreateProfilePayload = {
  user: string;
  username: string;
  level_id: number;
  player_position: number[];
};

export async function createProfileAction(payload: CreateProfilePayload) {
  return createProfile(payload);
}

export async function checkUsernameAvailabilityAction(username: string) {
  const normalizedUsername = username.trim();
  if (!normalizedUsername || normalizedUsername.length < 3) {
    return { available: false, reason: 'invalid' as const };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('profile')
    .select('user')
    .eq('username', normalizedUsername)
    .limit(1);

  if (error) {
    return { available: false, reason: 'error' as const, message: error.message };
  }

  return { available: (data?.length ?? 0) === 0, reason: 'ok' as const };
}
