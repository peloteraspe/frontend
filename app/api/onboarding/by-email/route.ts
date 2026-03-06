import { NextResponse } from 'next/server';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { rateLimitByRequest } from '@core/api/rateLimit';

type AdminAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

async function findAuthUserByEmail(email: string) {
  const supabase = getAdminSupabase();
  const perPage = 200;
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { user: null as AdminAuthUser | null, error };
    }

    const users = (data?.users ?? []) as AdminAuthUser[];
    const match = users.find((user) => String(user.email || '').toLowerCase() === email) ?? null;
    if (match) {
      return { user: match, error: null as null };
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return { user: null as AdminAuthUser | null, error: null as null };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError: Error) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        if (timer) clearTimeout(timer);
        reject(timeoutError);
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

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

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: 'Onboarding lookup is temporarily unavailable',
          code: 'ADMIN_LOOKUP_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    let lookupResult:
      | {
          user: AdminAuthUser | null;
          error: any;
        }
      | null = null;

    try {
      lookupResult = await withTimeout(
        findAuthUserByEmail(email),
        4000,
        new Error('Onboarding lookup timeout')
      );
    } catch (lookupError: any) {
      if (lookupError?.message === 'Onboarding lookup timeout') {
        return NextResponse.json(
          {
            error: 'Onboarding lookup timed out',
            code: 'ADMIN_LOOKUP_TIMEOUT',
          },
          { status: 503 }
        );
      }
      throw lookupError;
    }

    const { user: authUser, error: authError } = lookupResult;
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const supabase = getAdminSupabase();
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('*')
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
        (profile as any)?.username ||
        authUser.user_metadata?.username ||
        (authUser.email ? String(authUser.email).split('@')[0] : ''),
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
