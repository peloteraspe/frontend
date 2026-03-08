// src/core/api/supabase.browser.ts
'use client';
import { createBrowserClient } from '@supabase/ssr';

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder-anon-key';

function getPublicSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    return { supabaseUrl, supabaseAnonKey };
  }

  if (typeof window !== 'undefined') {
    const key = '__peloterasSupabaseEnvWarned';
    if (!(window as any)[key]) {
      (window as any)[key] = true;
      console.warn(
        'NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY no configurados; usando placeholders'
      );
    }
  }

  return {
    supabaseUrl: FALLBACK_SUPABASE_URL,
    supabaseAnonKey: FALLBACK_SUPABASE_ANON_KEY,
  };
}

export function getBrowserSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      domain: process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}
