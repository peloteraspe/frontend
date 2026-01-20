'use client';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Custom storage implementation to ensure session persistence
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const item = window.localStorage.getItem(key);
      console.log('🔍 Storage GET:', { key, hasValue: !!item, preview: item?.substring(0, 50) });
      return item;
    } catch (e) {
      console.error('❌ Storage GET error:', e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
      console.log('💾 Storage SET:', { key, size: value.length, preview: value.substring(0, 50) });
    } catch (e) {
      console.error('❌ Storage SET error:', e);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
      console.log('🗑️ Storage REMOVE:', { key });
    } catch (e) {
      console.error('❌ Storage REMOVE error:', e);
    }
  },
};

export const createClient = () => {
  console.log('🏗️ Creating Supabase client with enhanced storage...');

  const client = createBrowserClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      storage: customStorage,
      storageKey: 'supabase.auth.token',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  return client;
};
