import { redirect } from 'next/navigation';

import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';

type OnboardingProfileRow = {
  username?: string | null;
  level_id?: number | null;
  onboarding_step?: number | null;
  is_profile_complete?: boolean | null;
} | null;

function isProfileComplete(profile: OnboardingProfileRow) {
  if (!profile) return false;

  const hasUsername = typeof profile.username === 'string' && profile.username.trim().length >= 3;
  const hasLevel = typeof profile.level_id === 'number';
  const onboardingStep =
    typeof profile.onboarding_step === 'number' ? Number(profile.onboarding_step) : 0;

  return profile.is_profile_complete === true || onboardingStep >= 2 || (hasUsername && hasLevel);
}

export async function enforceOnboardingGuard(options?: { requireAuth?: boolean }) {
  const requireAuth = Boolean(options?.requireAuth);
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (requireAuth) redirect('/login');
    return { user: null, profile: null as OnboardingProfileRow };
  }

  const { data: profile, error } = await supabase
    .from('profile')
    .select('username, level_id, onboarding_step, is_profile_complete')
    .eq('user', user.id)
    .maybeSingle();

  if (error) {
    log.warn('Could not read onboarding profile from server guard', 'onboarding', {
      userId: user.id,
      error: error.message,
    });
    redirect('/signUp?step=2');
  }

  if (!isProfileComplete(profile)) {
    redirect('/signUp?step=2');
  }

  return { user, profile: profile ?? null };
}

