import { NextResponse } from 'next/server';
import { getBearer } from '@core/auth/bearer';
import { getUserIdFromToken } from '@core/auth/supabase-user';
import { backendFetch, backendUrl } from '@core/api/backend';
import { HTTP_401, HTTP_403, jsonNoStore } from '@core/api/responses';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { getServerSupabase } from '@core/api/supabase.server';

async function withTimeout<T = any>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

type RouteParams = { userId: string };

type ProfileRow = {
  id: number;
  user: string;
  username: string | null;
  level_id: number | null;
  onboarding_step: number | null;
  is_profile_complete: boolean | null;
};

async function resolveAuthUserId(request: Request) {
  const token = getBearer(request);
  if (token) {
    const byToken = await withTimeout(getUserIdFromToken(token), 5000, 'Token auth timeout');
    if (byToken) return byToken;
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await withTimeout(supabase.auth.getUser(), 5000, 'Cookie auth timeout');
  return user?.id ?? null;
}

async function getSupabaseFallbackClient() {
  try {
    return getAdminSupabase() as any;
  } catch (adminError) {
    console.warn('Admin Supabase unavailable, using session Supabase fallback', { adminError });
    return await getServerSupabase();
  }
}

function normalizePositionIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<number>();
  value.forEach((item) => {
    const parsed = Number(item);
    if (Number.isInteger(parsed) && parsed > 0) unique.add(parsed);
  });
  return Array.from(unique);
}

async function getProfileFallbackFromSupabase(userId: string) {
  const supabase = await getSupabaseFallbackClient();

  const { data: profile, error: profileError } = await withTimeout(
    supabase
      .from('profile')
      .select('id, user, username, level_id, onboarding_step, is_profile_complete')
      .eq('user', userId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
    6000,
    'Profile query timeout'
  );

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile) return null;

  const safeProfile = profile as ProfileRow;
  let levelName: string | null = null;

  if (typeof safeProfile.level_id === 'number') {
    const { data: levelRow, error: levelError } = await withTimeout(
      supabase
        .from('level')
        .select('name')
        .eq('id', safeProfile.level_id)
        .maybeSingle(),
      5000,
      'Level query timeout'
    );
    if (levelError) {
      throw new Error(levelError.message);
    }
    levelName = typeof levelRow?.name === 'string' ? levelRow.name : null;
  }

  const { data: profilePositions, error: profilePositionsError } = await withTimeout(
    supabase
      .from('profile_position')
      .select('position_id')
      .eq('profile_id', safeProfile.id),
    6000,
    'Profile positions query timeout'
  );

  if (profilePositionsError) {
    throw new Error(profilePositionsError.message);
  }

  const positionIds = normalizePositionIds((profilePositions ?? []).map((row: any) => row?.position_id));
  let playerPosition: Array<{ id: number; name: string }> = [];

  if (positionIds.length > 0) {
    const { data: positionsRows, error: positionsError } = await withTimeout(
      supabase
        .from('player_position')
        .select('id, name')
        .in('id', positionIds),
      6000,
      'Player positions catalog query timeout'
    );

    if (positionsError) {
      throw new Error(positionsError.message);
    }

    const byId = new Map<number, string>();
    (positionsRows ?? []).forEach((row: any) => {
      const id = Number(row?.id);
      const name = typeof row?.name === 'string' ? row.name.trim() : '';
      if (Number.isInteger(id) && id > 0 && name) {
        byId.set(id, name);
      }
    });

    playerPosition = positionIds
      .map((id) => ({ id, name: byId.get(id) ?? '' }))
      .filter((item) => item.name.length > 0);
  }

  return {
    ...safeProfile,
    level: levelName,
    player_position: playerPosition,
  };
}

async function patchProfileFallbackInSupabase(userId: string, rawBody: unknown) {
  const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as {
    username?: unknown;
    level_id?: unknown;
    player_position?: unknown;
  };

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const levelId = Number(body.level_id);
  const normalizedLevelId = Number.isFinite(levelId) ? levelId : null;
  const positionIds = normalizePositionIds(body.player_position);

  const supabase = await getSupabaseFallbackClient();

  const { data: existingRows, error: lookupError } = await supabase
    .from('profile')
    .select('id')
    .eq('user', userId)
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
        username,
        level_id: normalizedLevelId,
      })
      .eq('id', profileId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('profile')
      .insert({
        user: userId,
        username,
        level_id: normalizedLevelId,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }
    profileId = Number(inserted?.id);
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

  return getProfileFallbackFromSupabase(userId);
}

function stripPhoneFromProfilePayload(rawBody: unknown) {
  if (!rawBody || typeof rawBody !== 'object') return {};

  const { phone: _phone, ...rest } = rawBody as Record<string, unknown>;
  return rest;
}

export async function GET(request: Request, { params }: { params: Promise<RouteParams> }) {
  try {
    const { userId: routeUserId } = await params;

    const authUserId = await resolveAuthUserId(request);
    if (!authUserId) return HTTP_401;
    if (authUserId !== routeUserId) return HTTP_403;

    try {
      const res = await backendFetch(backendUrl(`/profile/${routeUserId}`));
      if (res.ok) {
        return jsonNoStore(await res.json());
      }

      const txt = await res.text().catch(() => '');
      console.warn('GET /api/profile backend failed, using Supabase fallback', {
        routeUserId,
        status: res.status,
        body: txt,
      });
    } catch (backendError) {
      console.warn('GET /api/profile backend request failed, using Supabase fallback', {
        routeUserId,
        backendError,
      });
    }

    const fallbackProfile = await getProfileFallbackFromSupabase(routeUserId);
    if (!fallbackProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return jsonNoStore(fallbackProfile);
  } catch (err) {
    console.error('GET /api/profile/[userId] failed:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<RouteParams> }) {
  try {
    const { userId: routeUserId } = await params;

    const authUserId = await resolveAuthUserId(request);
    if (!authUserId) return HTTP_401;
    if (authUserId !== routeUserId) return HTTP_403;

    const body = await request.json();
    const backendBody = stripPhoneFromProfilePayload(body);

    try {
      const res = await backendFetch(backendUrl(`/profile/${routeUserId}`), {
        method: 'PATCH',
        body: JSON.stringify(backendBody),
      });

      if (res.ok) {
        return NextResponse.json(await res.json());
      }

      const txt = await res.text().catch(() => '');
      if (res.status < 500) {
        return NextResponse.json(
          { error: txt || 'Failed to update profile in backend' },
          { status: res.status }
        );
      }

      console.warn('PATCH /api/profile backend failed, using Supabase fallback', {
        routeUserId,
        status: res.status,
        body: txt,
      });
    } catch (backendError) {
      console.warn('PATCH /api/profile backend request failed, using Supabase fallback', {
        routeUserId,
        backendError,
      });
    }

    const fallbackUpdatedProfile = await patchProfileFallbackInSupabase(routeUserId, body);
    return NextResponse.json(fallbackUpdatedProfile);
  } catch (err) {
    console.error('PATCH /api/profile/[userId] failed:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
