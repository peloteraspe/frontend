import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

export async function GET(request: Request) {
  // Await the headers promise to get the actual headers object
  const h = await headers();
  
  const currentDomain =
    h.get('origin') === 'http://localhost:3000'
      ? 'http://localhost:3000'
      : 'https://www.peloteras.com';

  const code = new URL(request.url).searchParams.get('code');
  if (code) {
    const cookieStore = await cookies(); // Await cookies() here
    const supabase = createClient(cookieStore);
    await supabase.auth.exchangeCodeForSession(code);
  }
  // URL to redirect to after sign in process completes
  return NextResponse.redirect(currentDomain);
}