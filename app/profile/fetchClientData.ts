// Client-side data fetching functions using fetch API

export async function fetchProfile(userId: string) {
  try {
    // Get the session token from Supabase client
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if we have a session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(`/api/profile/${userId}`, {
      headers
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // Profile not found is expected for new users
        return null;
      }
      throw new Error('Failed to fetch profile');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function fetchPlayersPosition() {
  try {
    const response = await fetch('/api/positions');
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
    const response = await fetch('/api/levels');
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
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if we have a session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(`/api/profile/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
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
