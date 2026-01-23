import { cookies } from 'next/headers';
import { getServerSupabase } from '@src/core/api/supabase.server';

export async function getUserIdFromToken(token: string) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  return error || !user ? null : (user.id as string);
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id as string;
}
