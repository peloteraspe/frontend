import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { sanitizeNextPath } from '@modules/auth/lib/redirect';
import { parseVerifiedPlayerQrValue } from '@modules/tickets/lib/verifiedPlayerQr';
import { isAdmin } from '@shared/lib/auth/isAdmin';

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No authenticated user.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const nextPath = sanitizeNextPath(body?.nextPath);

  if (!nextPath) {
    return NextResponse.json({ destination: '/' });
  }

  const isVerifiedPlayerPath = Boolean(parseVerifiedPlayerQrValue(nextPath));
  if (isVerifiedPlayerPath && !isAdmin(user as any)) {
    return NextResponse.json({ destination: '/' });
  }

  return NextResponse.json({ destination: nextPath });
}
