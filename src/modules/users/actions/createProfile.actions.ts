'use server';

import { createProfile, updateProfileByUserId } from '@modules/users/api/profile.server';
import { getServerSupabase } from '@core/api/supabase.server';

export type CreateProfilePayload = {
  user: string;
  username: string;
  level_id: number | null;
  player_position: number[];
};

export type UpdateProfilePayload = {
  username: string;
  level_id: number;
  player_position: number[];
};

export async function createProfileAction(payload: CreateProfilePayload) {
  return createProfile(payload);
}

export async function updateProfileAction(userId: string, payload: UpdateProfilePayload) {
  return updateProfileByUserId(userId, payload);
}

async function saveOnboardingProfileState(
  userId: string,
  values: {
    username: string;
    level_id: number | null;
    onboarding_step: number;
    is_profile_complete: boolean;
  }
) {
  const supabase = await getServerSupabase();
  const { data: existingRows, error: lookupError } = await supabase
    .from('profile')
    .select('user')
    .eq('user', userId)
    .limit(1);

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const payload = {
    user: userId,
    username: values.username.trim(),
    level_id: values.level_id,
    onboarding_step: values.onboarding_step,
    is_profile_complete: values.is_profile_complete,
  };

  if ((existingRows?.length ?? 0) > 0) {
    const { error } = await supabase.from('profile').update(payload).eq('user', userId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('profile').insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}

export async function completeOnboardingProfileAction(payload: CreateProfilePayload) {
  const profilePayload: UpdateProfilePayload = {
    username: payload.username.trim(),
    level_id: payload.level_id as number,
    player_position: payload.player_position,
  };

  try {
    await updateProfileByUserId(payload.user, profilePayload);
  } catch (error: any) {
    const message = String(error?.message || error || '').toLowerCase();
    if (!message.includes('404') && !message.includes('not found')) {
      throw error;
    }
    await createProfile({
      ...payload,
      username: payload.username.trim(),
    });
  }

  await saveOnboardingProfileState(payload.user, {
    username: payload.username,
    level_id: payload.level_id,
    onboarding_step: 2,
    is_profile_complete: true,
  });
}

export async function checkUsernameAvailabilityAction(username: string, currentUserId?: string) {
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

  const matchingUserId = data?.[0]?.user;
  const isSameUser = Boolean(currentUserId) && matchingUserId === currentUserId;

  return {
    available: (data?.length ?? 0) === 0 || isSameUser,
    reason: 'ok' as const,
  };
}
