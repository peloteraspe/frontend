import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// If you want createClient to accept the cookies object (not a promise), use Awaited<...>:
export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>
) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Handle errors if needed
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // Handle errors if needed
        }
      },
    },
    cookieOptions: {
      domain: process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN,
    },
  });
};