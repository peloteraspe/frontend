// src/core/api/supabase.server.ts
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder-anon-key';

declare global {
  // eslint-disable-next-line no-var
  var __peloterasSupabaseEnvWarned: boolean | undefined;
}

function getPublicSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    return { supabaseUrl, supabaseAnonKey };
  }

  if (!globalThis.__peloterasSupabaseEnvWarned) {
    globalThis.__peloterasSupabaseEnvWarned = true;
    console.warn(
      'NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY no configurados; usando placeholders'
    );
  }

  return {
    supabaseUrl: FALLBACK_SUPABASE_URL,
    supabaseAnonKey: FALLBACK_SUPABASE_ANON_KEY,
  };
}

export async function getServerSupabase() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', maxAge: 0, ...options });
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
