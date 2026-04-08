// Client-side data fetching functions using fetch API
import type { UserProfileData, UserProfileUpdate } from '@modules/users/model/types';

const PROFILE_FETCH_TIMEOUT_MS = 12000;

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = PROFILE_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      cache: 'no-store',
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = PROFILE_FETCH_TIMEOUT_MS,
  message = 'Request timeout'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function fetchProfileFromSupabase(userId: string): Promise<UserProfileData | null> {
  const { getBrowserSupabase } = await import('@src/core/api/supabase.browser');
  const supabase = getBrowserSupabase();

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

  if (profileError || !profile) return null;

  const { data: profilePositions, error: profilePositionsError } = await withTimeout(
    supabase
      .from('profile_position')
      .select('position_id')
      .eq('profile_id', profile.id),
    6000,
    'Profile positions query timeout'
  );
  if (profilePositionsError) return null;

  const positionIds = (profilePositions ?? [])
    .map((row: { position_id: number }) => Number(row.position_id))
    .filter((id) => Number.isFinite(id));

  let playerPosition: Array<{ id: number; name: string }> = [];
  if (positionIds.length > 0) {
    const { data: positions, error: positionsError } = await withTimeout(
      supabase
        .from('player_position')
        .select('id, name')
        .in('id', positionIds),
      6000,
      'Player positions catalog query timeout'
    );

    if (!positionsError) {
      const byId = new Map((positions ?? []).map((row: { id: number; name: string }) => [row.id, row.name]));
      playerPosition = positionIds
        .map((id) => ({ id, name: byId.get(id) || '' }))
        .filter((row) => row.name);
    }
  }

  let levelName: string | null = null;
  if (profile.level_id != null) {
    const { data: levelData, error: levelError } = await withTimeout(
      supabase
        .from('level')
        .select('name')
        .eq('id', profile.level_id)
        .maybeSingle(),
      5000,
      'Level query timeout'
    );

    if (!levelError) {
      levelName = (levelData as { name?: string } | null)?.name ?? null;
    }
  }

  return {
    ...profile,
    level: levelName,
    player_position: playerPosition,
  };
}

export async function fetchProfile(userId: string): Promise<UserProfileData | null> {
  try {
    // Get the session token from Supabase client
    const { getBrowserSupabase } = await import('@src/core/api/supabase.browser');
    const supabase = getBrowserSupabase();
    const {
      data: { session },
    } = await withTimeout(supabase.auth.getSession());

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if we have a session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetchWithTimeout(`/api/profile/${userId}`, {
      headers,
    });

    if (response.ok) {
      return await response.json();
    }

    if (response.status !== 404) {
      console.warn(`API profile failed with ${response.status}, trying Supabase fallback`);
    }

    return await fetchProfileFromSupabase(userId);
  } catch (error) {
    const message = String((error as any)?.message ?? error);
    if (/timeout|abort/i.test(message)) {
      console.warn('Profile request timed out, trying Supabase fallback');
    } else {
      console.error('Error fetching profile:', error);
    }

    try {
      return await fetchProfileFromSupabase(userId);
    } catch (fallbackError) {
      console.error('Supabase fallback for profile failed:', fallbackError);
      return null;
    }
  }
}

export async function fetchPlayersPosition() {
  try {
    const response = await fetchWithTimeout('/api/positions');
    if (!response.ok) {
      throw new Error('Failed to fetch positions');
    }
    const result = await response.json();
    // API returns { data: [...] }, extract the data array
    return result.data || [];
  } catch (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
}

export async function fetchLevels() {
  try {
    const response = await fetchWithTimeout('/api/levels');
    if (!response.ok) {
      throw new Error('Failed to fetch levels');
    }
    const result = await response.json();
    // API returns { data: [...] }, extract the data array
    return result.data || [];
  } catch (error) {
    console.error('Error fetching levels:', error);
    return [];
  }
}

// Update profile function
export async function updateProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<UserProfileData | null> {
  try {
    // Get the session token from Supabase client
    const { getBrowserSupabase } = await import('@src/core/api/supabase.browser');
    const supabase = getBrowserSupabase();
    const {
      data: { session },
    } = await withTimeout(supabase.auth.getSession());

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if we have a session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetchWithTimeout(`/api/profile/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update profile: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}
