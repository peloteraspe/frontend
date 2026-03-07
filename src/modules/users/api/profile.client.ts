// Client-side data fetching functions using fetch API

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

async function withTimeout<T>(promise: Promise<T>, timeoutMs = PROFILE_FETCH_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function fetchProfile(userId: string) {
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

    if (!response.ok) {
      if ([401, 403, 404, 500].includes(response.status)) {
        // Profile not found is expected for new users
        return null;
      }
      const details = await response.text().catch(() => '');
      throw new Error(`Failed to fetch profile (${response.status})${details ? `: ${details}` : ''}`);
    }
    return await response.json();
  } catch (error) {
    const message = String((error as any)?.message ?? error);
    if (/timeout|abort/i.test(message)) {
      console.warn('Profile request timed out, using fallback state');
      return null;
    }
    console.error('Error fetching profile:', error);
    return null;
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
export async function updateProfile(userId: string, updates: any) {
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
