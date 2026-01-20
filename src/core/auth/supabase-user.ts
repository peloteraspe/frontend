import { cookies } from 'next/headers';
import { createClient } from '@core/api/server';

export async function getUserIdFromToken(token: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  return error || !user ? null : (user.id as string);
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id as string;
}
