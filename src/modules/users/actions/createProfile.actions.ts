'use server';

import { createProfile, updateProfileByUserId } from '@modules/users/api/profile.server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';

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

function normalizeErrorMessage(error: unknown) {
  return String((error as any)?.message || error || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isUserMissingError(message: string) {
  return (
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('no se encontro el user') ||
    message.includes('no se encontro el usuario') ||
    message.includes('user not found') ||
    message.includes('usuario no encontrado')
  );
}

function isProfileUserFkError(message: string) {
  return message.includes('profile_user_fkey') || message.includes('foreign key constraint');
}

async function saveProfileAndPositionsDirectly(payload: CreateProfilePayload) {
  const supabase = getAdminSupabase();

  const normalizedUsername = payload.username.trim();
  const levelId = Number(payload.level_id);
  const positionIds = payload.player_position
    .map((positionId) => Number(positionId))
    .filter((positionId) => Number.isFinite(positionId));

  const { data: existingRows, error: lookupError } = await supabase
    .from('profile')
    .select('id')
    .eq('user', payload.user)
    .order('id', { ascending: true })
    .limit(1);

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  let profileId: number;

  if ((existingRows?.length ?? 0) > 0) {
    profileId = Number(existingRows?.[0]?.id);
    const { error: updateError } = await supabase
      .from('profile')
      .update({
        username: normalizedUsername,
        level_id: levelId,
        onboarding_step: 2,
        is_profile_complete: true,
      })
      .eq('id', profileId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { data: insertedProfile, error: insertError } = await supabase
      .from('profile')
      .insert({
        user: payload.user,
        username: normalizedUsername,
        level_id: levelId,
        onboarding_step: 2,
        is_profile_complete: true,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    profileId = Number(insertedProfile?.id);
  }

  const { error: deletePositionsError } = await supabase
    .from('profile_position')
    .delete()
    .eq('profile_id', profileId);

  if (deletePositionsError) {
    throw new Error(deletePositionsError.message);
  }

  if (positionIds.length > 0) {
    const { error: insertPositionsError } = await supabase.from('profile_position').insert(
      positionIds.map((positionId) => ({
        profile_id: profileId,
        position_id: positionId,
      }))
    );

    if (insertPositionsError) {
      throw new Error(insertPositionsError.message);
    }
  }
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
  const payload = {
    user: userId,
    username: values.username.trim(),
    level_id: values.level_id,
    onboarding_step: values.onboarding_step,
    is_profile_complete: values.is_profile_complete,
  };

  const upsertProfileState = async (supabase: Awaited<ReturnType<typeof getServerSupabase>>) => {
    const { data: existingRows, error: lookupError } = await supabase
      .from('profile')
      .select('user')
      .eq('user', userId)
      .limit(1);

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if ((existingRows?.length ?? 0) > 0) {
      const { error } = await supabase.from('profile').update(payload).eq('user', userId);
      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await supabase.from('profile').insert(payload);
    if (error) {
      throw new Error(error.message);
    }
  };

  try {
    const sessionSupabase = await getServerSupabase();
    await upsertProfileState(sessionSupabase);
  } catch (error: any) {
    log.warn('Saving onboarding profile state with session client failed; using admin fallback', 'SIGNUP', {
      userId,
      error: String(error?.message || error || 'Unknown error'),
    });
    const adminSupabase = getAdminSupabase();
    await upsertProfileState(adminSupabase as any);
  }

  const adminSupabase = getAdminSupabase();
  const { data: persistedRow, error: verifyError } = await adminSupabase
    .from('profile')
    .select('user, onboarding_step, is_profile_complete, level_id, username')
    .eq('user', userId)
    .maybeSingle();

  if (verifyError) {
    throw new Error(verifyError.message);
  }
  if (!persistedRow) {
    throw new Error('No se pudo persistir el profile del onboarding.');
  }
}

async function syncAuthUserMetadata(userId: string, username: string) {
  const adminSupabase = getAdminSupabase();
  const normalizedUsername = username.trim();

  const { data: authUserData, error: getUserError } = await adminSupabase.auth.admin.getUserById(
    userId
  );

  if (getUserError) {
    log.warn('Could not read auth user for metadata sync', 'SIGNUP', {
      userId,
      error: getUserError.message,
    });
    return;
  }

  const currentMetadata = (authUserData?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMetadata,
      username: normalizedUsername,
      gender_identity_confirmed: true,
    },
  });

  if (updateError) {
    log.warn('Could not sync username into auth metadata', 'SIGNUP', {
      userId,
      error: updateError.message,
    });
  }
}

export async function completeOnboardingProfileAction(payload: CreateProfilePayload) {
  const profilePayload: UpdateProfilePayload = {
    username: payload.username.trim(),
    level_id: payload.level_id as number,
    player_position: payload.player_position,
  };

  let usedDirectSupabaseFallback = false;

  try {
    await updateProfileByUserId(payload.user, profilePayload);
  } catch (error: any) {
    const message = normalizeErrorMessage(error);
    const shouldFallbackToCreate = isUserMissingError(message);

    if (!shouldFallbackToCreate) {
      throw error;
    }

    try {
      await createProfile({
        ...payload,
        username: payload.username.trim(),
      });
    } catch (createError: any) {
      const createMessage = normalizeErrorMessage(createError);
      if (!isProfileUserFkError(createMessage) && !isUserMissingError(createMessage)) {
        throw createError;
      }

      log.warn(
        'Backend profile endpoints could not persist onboarding profile; using direct Supabase fallback',
        'SIGNUP',
        {
          userId: payload.user,
          reason: createMessage,
        }
      );

      await saveProfileAndPositionsDirectly(payload);
      usedDirectSupabaseFallback = true;
    }
  }

  if (!usedDirectSupabaseFallback) {
    await saveOnboardingProfileState(payload.user, {
      username: payload.username,
      level_id: payload.level_id,
      onboarding_step: 2,
      is_profile_complete: true,
    });
  }

  await syncAuthUserMetadata(payload.user, payload.username);
}

export async function checkUsernameAvailabilityAction(
  username: string | null | undefined,
  currentUserId?: string
) {
  const normalizedUsername = String(username ?? '').trim();
  if (!normalizedUsername || normalizedUsername.length < 3) {
    return { available: false, reason: 'invalid' as const };
  }

  let matchingUserId: string | null | undefined;
  let lookupError: string | null = null;

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('profile')
      .select('user')
      .eq('username', normalizedUsername)
      .limit(1);

    if (!error) {
      matchingUserId = data?.[0]?.user ?? null;
    } else {
      lookupError = error.message;
      log.warn('Username lookup failed via server Supabase client', 'SIGNUP', {
        username: normalizedUsername,
        error: error.message,
      });
    }
  } catch (error: any) {
    lookupError = String(error?.message || error || 'Unknown server Supabase error');
    log.warn('Username lookup crashed via server Supabase client', 'SIGNUP', {
      username: normalizedUsername,
      error: lookupError,
    });
  }

  if (matchingUserId === undefined) {
    try {
      const adminSupabase = getAdminSupabase();
      const { data, error } = await adminSupabase
        .from('profile')
        .select('user')
        .eq('username', normalizedUsername)
        .limit(1);

      if (error) {
        lookupError = error.message;
      } else {
        matchingUserId = data?.[0]?.user ?? null;
      }
    } catch (error: any) {
      lookupError = String(error?.message || error || 'Unknown admin Supabase error');
      log.warn('Username lookup crashed via admin Supabase client', 'SIGNUP', {
        username: normalizedUsername,
        error: lookupError,
      });
    }
  }

  if (matchingUserId === undefined) {
    return {
      available: false,
      reason: 'error' as const,
      message: lookupError || 'No se pudo validar el nombre de usuario.',
    };
  }

  const isSameUser = Boolean(currentUserId) && matchingUserId === currentUserId;

  return {
    available: !matchingUserId || isSameUser,
    reason: 'ok' as const,
  };
}
