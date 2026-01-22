// src/modules/auth/api/handlers/signout.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSupabase } from '@src/core/api/supabase.server';

export const runtime = 'nodejs';

function redirectTo(path: string, req: NextRequest) {
  return new URL(path, req.url);
}

export async function GET(request: NextRequest) {
  const supabase = await getServerSupabase();

  try {
    await supabase.auth.signOut();
  } catch {}

  return NextResponse.redirect(redirectTo('/login', request));
}

export async function POST(request: NextRequest) {
  return GET(request);
}
