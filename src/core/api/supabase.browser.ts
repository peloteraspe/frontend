// src/core/api/supabase.browser.ts
'use client';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const isDev = process.env.NODE_ENV !== 'production';

const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const item = window.localStorage.getItem(key);
      if (isDev) console.log('🔍 Storage GET:', { key, hasValue: !!item });
      return item;
    } catch (e) {
      if (isDev) console.error('❌ Storage GET error:', e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
      if (isDev) console.log('💾 Storage SET:', { key, size: value.length });
    } catch (e) {
      if (isDev) console.error('❌ Storage SET error:', e);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
      if (isDev) console.log('🗑️ Storage REMOVE:', { key });
    } catch (e) {
      if (isDev) console.error('❌ Storage REMOVE error:', e);
    }
  },
};

export function getBrowserSupabase() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: customStorage,
      storageKey: 'supabase.auth.token',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}
