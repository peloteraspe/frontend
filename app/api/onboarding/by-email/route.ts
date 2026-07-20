import { NextResponse } from 'next/server';

import { rateLimitByRequest } from '@core/api/rateLimit';
import { getServerSupabase } from '@core/api/supabase.server';

export async function POST(request: Request) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_onboarding_by_email_post',
    limit: 40,
    windowMs: 60_000,
    message:
      'Has realizado demasiadas validaciones de correo. Espera un momento e inténtalo nuevamente.',
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email || '')
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (String(user.email || '').toLowerCase() !== email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // KAN-24: this endpoint only returns the caller's own onboarding state.
    // It must not be used as a public email-existence lookup.
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('username, onboarding_step, is_profile_complete, level_id')
      .eq('user', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      emailConfirmed: Boolean(user.email_confirmed_at),
      username:
        (profile as any)?.username ||
        user.user_metadata?.username ||
        (user.email ? String(user.email).split('@')[0] : ''),
      onboardingStep: (profile as any)?.onboarding_step ?? null,
      isProfileComplete: (profile as any)?.is_profile_complete ?? null,
      levelId: (profile as any)?.level_id ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch onboarding state' },
      { status: 500 }
    );
  }
}
