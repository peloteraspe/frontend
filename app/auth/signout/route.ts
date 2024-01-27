// app/auth/signout.ts or app/auth/signout/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export async function GET(request: { nextUrl: { clone: () => any } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  const url = request.nextUrl.clone();
  url.pathname = '/';

  // Redirect to the login page after sign out
  return NextResponse.redirect(url);
}
