import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();

  // Construct an absolute URL for the redirect
  const url = request.nextUrl.clone();
  url.pathname = '/login';

  // Redirect to the login page after sign out
  return NextResponse.redirect(url);
}
