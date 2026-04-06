import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

function isComingSoonEnabled() {
  if (process.env.NODE_ENV !== 'production') return false;
  const mode = (process.env.COMING_SOON_MODE ?? '').trim().toLowerCase();
  return mode === 'on' || mode === 'true' || mode === '1';
}

function isAllowedPath(pathname: string) {
  if (pathname === '/') return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/assets')) return true;
  if (pathname.startsWith('/api/waitlist')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

function isPublicPath(pathname: string) {
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api')) return true;
  if (pathname.startsWith('/assets')) return true;
  if (pathname.startsWith('/auth')) return true;
  if (pathname === '/login') return true;
  if (pathname === '/signUp') return true;
  if (pathname === '/favicon.ico') return true;
  if (pathname === '/robots.txt') return true;
  if (pathname === '/sitemap.xml') return true;
  return false;
}

function parseNumeric(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isProfileComplete(profile: {
  username?: string | null;
  level_id?: number | string | null;
  onboarding_step?: number | string | null;
  is_profile_complete?: boolean | null;
} | null) {
  if (!profile) return false;

  const hasUsername = typeof profile.username === 'string' && profile.username.trim().length >= 3;
  const hasLevel = parseNumeric(profile.level_id) !== null;
  const onboardingStep = parseNumeric(profile.onboarding_step) ?? 0;

  return profile.is_profile_complete === true || onboardingStep >= 2 || (hasUsername && hasLevel);
}

export async function proxy(request: NextRequest) {
  if (!isComingSoonEnabled()) {
    const { pathname } = request.nextUrl;
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.next();
    }

    const response = NextResponse.next();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return response;
    }

    const { data: profile } = await supabase
      .from('profile')
      .select('username, level_id, onboarding_step, is_profile_complete')
      .eq('user', user.id)
      .maybeSingle();

    if (!isProfileComplete(profile ?? null)) {
      const url = new URL('/signUp?step=2', request.url);
      const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search || ''}`;
      if (nextPath && nextPath !== '/signUp') {
        url.searchParams.set('next', nextPath);
      }
      return NextResponse.redirect(url);
    }

    return response;
  }

  const { pathname, search } = request.nextUrl;
  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  const url = new URL('/', request.url);
  if (search) url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/:path*',
};
