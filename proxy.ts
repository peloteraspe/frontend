import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isComingSoonEnabled() {
  if (process.env.NODE_ENV !== 'production') return false;
  if (process.env.COMING_SOON_MODE === 'off') return false;
  return true;
}

function isAllowedPath(pathname: string) {
  if (pathname === '/') return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/assets')) return true;
  if (pathname.startsWith('/api/waitlist')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

export function proxy(request: NextRequest) {
  if (!isComingSoonEnabled()) {
    return NextResponse.next();
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
