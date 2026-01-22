// src/core/api/supabase.server.ts
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function getServerSupabase() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
    cookieOptions: {
      domain: process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN,
    },
  });
}

export async function withSupabase<T>(
  fn: (sb: Awaited<ReturnType<typeof getServerSupabase>>) => Promise<T>
) {
  const sb = await getServerSupabase();
  return fn(sb);
}
