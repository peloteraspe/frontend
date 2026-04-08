'use server';

import { createProfile, updateProfileByUserId } from '@modules/users/api/profile.server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import { normalizePhoneMetadata } from '@shared/lib/phone';

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

export type CompleteOnboardingProfileResult =
  | { ok: true }
  | {
      ok: false;
      code: 'USERNAME_TAKEN' | 'USER_NOT_READY' | 'TRANSIENT' | 'UNKNOWN';
      message: string;
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

function isProfileUsernameConflictError(message: string) {
  return (
    message.includes('profile_username_key') ||
    message.includes('duplicate key value violates unique constraint') ||
    (message.includes('unique') && message.includes('username'))
  );
}

function isTransientProfileBackendError(message: string) {
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('tardo demasiado') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('internal server error') ||
    message.includes('service unavailable') ||
    message.includes('bad gateway') ||
    message.includes('gateway timeout') ||
    message.includes(' 500') ||
    message.startsWith('500')
  );
}

function resolveAvatarFromMetadata(metadata: Record<string, unknown>) {
  const candidates = [
    metadata.avatar,
    metadata.avatar_url,
    metadata.picture,
    metadata.photoURL,
    metadata.profile_image_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function tryGetAdminSupabase(context: string) {
  try {
    return getAdminSupabase();
  } catch (error: any) {
    log.warn('Supabase admin client unavailable in onboarding action', 'SIGNUP', {
      context,
      error: String(error?.message || error || 'Unknown error'),
    });
    return null;
  }
}

async function saveProfileAndPositionsDirectly(payload: CreateProfilePayload) {
  const supabase = tryGetAdminSupabase('saveProfileAndPositionsDirectly');
  if (!supabase) {
    throw new Error('Supabase admin client is unavailable');
  }

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

  if (!Number.isFinite(profileId) || profileId <= 0) {
    throw new Error('No se pudo resolver el perfil para completar onboarding.');
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

async function saveProfileAndPositionsWithRetry(payload: CreateProfilePayload, attempts = 3) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await saveProfileAndPositionsDirectly(payload);
      return;
    } catch (error: any) {
      lastError = error;
      const message = normalizeErrorMessage(error);
      const canRetry = isProfileUserFkError(message) || isTransientProfileBackendError(message);
      if (!canRetry || attempt >= attempts) {
        throw error;
      }

      const delayMs = 200 * attempt;
      log.warn('Retrying direct profile persistence for onboarding', 'SIGNUP', {
        userId: payload.user,
        attempt,
        delayMs,
        reason: message,
      });
      await wait(delayMs);
    }
  }

  throw lastError || new Error('No se pudo guardar el perfil.');
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

  let persisted = false;

  try {
    const sessionSupabase = await getServerSupabase();
    await upsertProfileState(sessionSupabase);
    persisted = true;
  } catch (error: any) {
    log.warn('Saving onboarding profile state with session client failed; using admin fallback', 'SIGNUP', {
      userId,
      error: String(error?.message || error || 'Unknown error'),
    });

    const adminSupabase = tryGetAdminSupabase('saveOnboardingProfileState');
    if (adminSupabase) {
      try {
        await upsertProfileState(adminSupabase as any);
        persisted = true;
      } catch (adminError: any) {
        log.warn('Saving onboarding profile state with admin client failed', 'SIGNUP', {
          userId,
          error: String(adminError?.message || adminError || 'Unknown error'),
        });
      }
    }
  }

  if (!persisted) {
    // Do not block signup completion for metadata-only persistence failures.
    log.warn('Skipping onboarding profile state verification because persistence failed', 'SIGNUP', {
      userId,
    });
    return;
  }

  try {
    const sessionSupabase = await getServerSupabase();
    const { data: persistedRow, error: verifyError } = await sessionSupabase
      .from('profile')
      .select('user')
      .eq('user', userId)
      .maybeSingle();

    if (verifyError || !persistedRow) {
      log.warn('Could not verify onboarding profile state after persistence', 'SIGNUP', {
        userId,
        error: String(verifyError?.message || 'Missing persisted row'),
      });
    }
  } catch (error: any) {
    log.warn('Onboarding profile state verification failed', 'SIGNUP', {
      userId,
      error: String(error?.message || error || 'Unknown error'),
    });
  }
}

async function syncAuthUserMetadata(userId: string, username: string) {
  const adminSupabase = tryGetAdminSupabase('syncAuthUserMetadata');
  if (!adminSupabase) {
    return;
  }

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

  const currentMetadata = normalizePhoneMetadata(authUserData?.user?.user_metadata);
  const avatarUrl = resolveAvatarFromMetadata(currentMetadata);
  const nextMetadata: Record<string, unknown> = {
    ...currentMetadata,
    username: normalizedUsername,
    gender_identity_confirmed: true,
  };

  if (avatarUrl) {
    nextMetadata.avatar = avatarUrl;
    nextMetadata.avatar_url = avatarUrl;
  }

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
    user_metadata: nextMetadata,
  });

  if (updateError) {
    log.warn('Could not sync username into auth metadata', 'SIGNUP', {
      userId,
      error: updateError.message,
    });
  }
}

export async function completeOnboardingProfileAction(
  payload: CreateProfilePayload
): Promise<CompleteOnboardingProfileResult> {
  try {
    const profilePayload: UpdateProfilePayload = {
      username: payload.username.trim(),
      level_id: payload.level_id as number,
      player_position: payload.player_position,
    };

    let usedDirectSupabaseFallback = false;
    const normalizedUsername = payload.username.trim();

    try {
      await updateProfileByUserId(payload.user, profilePayload);
    } catch (error: any) {
      const message = normalizeErrorMessage(error);
      if (isProfileUsernameConflictError(message)) {
        throw error;
      }

      log.warn('Backend update profile failed in onboarding; trying create/fallback', 'SIGNUP', {
        userId: payload.user,
        reason: message,
      });

      try {
        await createProfile({
          ...payload,
          username: normalizedUsername,
        });
      } catch (createError: any) {
        const createMessage = normalizeErrorMessage(createError);
        if (isProfileUsernameConflictError(createMessage)) {
          throw createError;
        }

        const shouldUseDirectFallback =
          isProfileUserFkError(createMessage) ||
          isUserMissingError(createMessage) ||
          isTransientProfileBackendError(createMessage) ||
          isTransientProfileBackendError(message);

        if (!shouldUseDirectFallback) {
          throw createError;
        }

        log.warn(
          'Backend profile endpoints could not persist onboarding profile; using direct Supabase fallback',
          'SIGNUP',
          {
            userId: payload.user,
            updateReason: message,
            createReason: createMessage,
          }
        );

        await saveProfileAndPositionsWithRetry(
          {
            ...payload,
            username: normalizedUsername,
          },
          4
        );
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
    return { ok: true };
  } catch (error: any) {
    const message = normalizeErrorMessage(error);
    log.warn('Complete onboarding profile action failed', 'SIGNUP', {
      userId: payload.user,
      reason: message,
    });

    if (isProfileUsernameConflictError(message)) {
      return {
        ok: false,
        code: 'USERNAME_TAKEN',
        message: 'El nombre de usuario ya está en uso, elige otro.',
      };
    }

    if (isProfileUserFkError(message) || isUserMissingError(message)) {
      return {
        ok: false,
        code: 'USER_NOT_READY',
        message: 'No pudimos completar tu perfil ahora. Puedes terminarlo cuando inicies sesión.',
      };
    }

    if (isTransientProfileBackendError(message)) {
      return {
        ok: false,
        code: 'TRANSIENT',
        message: 'No pudimos completar tu perfil ahora. Intenta nuevamente en unos segundos.',
      };
    }

    return {
      ok: false,
      code: 'UNKNOWN',
      message: 'No se pudo crear el perfil.',
    };
  }
}

export async function checkUsernameAvailabilityAction(
  username: string | null | undefined,
  currentUserId?: string
) {
  try {
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
  } catch (error: any) {
    const message = String(error?.message || error || 'Unexpected username lookup error');
    log.warn('Username lookup action failed unexpectedly', 'SIGNUP', {
      username: String(username ?? ''),
      error: message,
    });
    return {
      available: false,
      reason: 'error' as const,
      message: 'No se pudo validar el nombre de usuario.',
    };
  }
}
