import { NextResponse } from 'next/server';

import { getAdminSupabase } from '@core/api/supabase.admin';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email || '')
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    const { data: listedUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const users = (listedUsers?.users ?? []) as Array<{
      id: string;
      email?: string | null;
      email_confirmed_at?: string | null;
      user_metadata?: Record<string, unknown> | null;
    }>;

    const authUser = users.find((user) => String(user.email || '').toLowerCase() === email) ?? null;

    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('user, username, level_id, onboarding_step, is_profile_complete')
      .eq('user', authUser.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      userId: authUser.id,
      email: authUser.email,
      emailConfirmed: Boolean(authUser.email_confirmed_at),
      username:
        profile?.username ||
        authUser.user_metadata?.username ||
        (authUser.email ? String(authUser.email).split('@')[0] : ''),
      onboardingStep: profile?.onboarding_step ?? null,
      isProfileComplete: profile?.is_profile_complete ?? null,
      levelId: profile?.level_id ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch onboarding state' },
      { status: 500 }
    );
  }
}
