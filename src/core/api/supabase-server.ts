import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from './server';
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}
export async function withSupabase<T>(fn: (sb: ReturnType<typeof createClient>) => Promise<T>) {
  const sb = await getServerSupabase();
  return fn(sb);
}
