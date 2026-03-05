// src/modules/auth/api/handlers/signout.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@src/core/lib/logger';

function listSupabaseAuthCookieNames(request: NextRequest) {
  const namesFromRequest = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter(
      (name) =>
        name.includes('sb-') || name.includes('supabase-auth-token') || name.includes('supabase')
    );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = (() => {
    try {
      return new URL(supabaseUrl).hostname.split('.')[0] || '';
    } catch {
      return '';
    }
  })();

  const baseNames = ['supabase-auth-token'];
  if (projectRef) {
    baseNames.push(`sb-${projectRef}-auth-token`);
    baseNames.push(`sb-${projectRef}-auth-token-code-verifier`);
  }

  const expectedNames = new Set<string>();
  for (const baseName of baseNames) {
    expectedNames.add(baseName);
    expectedNames.add(`__Secure-${baseName}`);
    expectedNames.add(`__Host-${baseName}`);
    for (let i = 0; i < 6; i += 1) {
      expectedNames.add(`${baseName}.${i}`);
      expectedNames.add(`__Secure-${baseName}.${i}`);
      expectedNames.add(`__Host-${baseName}.${i}`);
    }
  }

  for (const name of namesFromRequest) {
    expectedNames.add(name);
  }

  return Array.from(expectedNames);
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  const cookieNames = listSupabaseAuthCookieNames(request);
  const cookieDomain = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN;
  const host = request.nextUrl.hostname;
  for (const name of cookieNames) {
    response.cookies.set({
      name,
      value: '',
      maxAge: 0,
      path: '/',
    });

    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      response.cookies.set({
        name,
        value: '',
        maxAge: 0,
        path: '/',
        domain: host,
      });
      response.cookies.set({
        name,
        value: '',
        maxAge: 0,
        path: '/',
        domain: `.${host}`,
      });
    }

    if (cookieDomain) {
      response.cookies.set({
        name,
        value: '',
        maxAge: 0,
        path: '/',
        domain: cookieDomain,
      });
    }
  }
}

export async function GET(request: NextRequest) {
  const supabase = await getServerSupabase();
  const response = NextResponse.redirect(new URL('/login', request.url));

  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch (error) {
    log.warn('Sign out failed', 'AUTH_SIGNOUT', error);
  }

  clearSupabaseAuthCookies(request, response);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: NextRequest) {
  const supabase = await getServerSupabase();
  const response = NextResponse.json({ ok: true });

  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch (error) {
    log.warn('Sign out failed', 'AUTH_SIGNOUT', error);
  }

  clearSupabaseAuthCookies(request, response);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
