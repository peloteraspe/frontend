// src/modules/auth/api/handlers/signout.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@src/core/lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const supabase = await getServerSupabase();

  try {
    await supabase.auth.signOut();
  } catch (error) {
    log.warn('Sign out failed', 'AUTH_SIGNOUT', error);
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function POST(request: NextRequest) {
  return GET(request);
}
