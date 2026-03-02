export type OnboardingProfileState = {
  username?: string | null;
  level_id?: number | null;
  onboarding_step?: number | null;
  is_profile_complete?: boolean | null;
} | null;

export function resolveNextOnboardingStep(
  profile: OnboardingProfileState,
  isEmailConfirmed: boolean,
  hasAuthenticatedUser = false
): 1 | 2 | 3 | null {
  const completedStep = typeof profile?.onboarding_step === 'number' ? profile.onboarding_step : 0;
  const hasUsername = typeof profile?.username === 'string' && profile.username.trim().length >= 3;
  const hasLevel = typeof profile?.level_id === 'number';
  const isProfileComplete = profile?.is_profile_complete === true || (hasUsername && hasLevel);

  if (completedStep >= 2 || isProfileComplete) {
    return isEmailConfirmed ? null : 3;
  }

  if (completedStep >= 1 || hasUsername) {
    return 2;
  }

  return hasAuthenticatedUser ? 2 : 1;
}

export function getOnboardingDestination(
  profile: OnboardingProfileState,
  isEmailConfirmed: boolean,
  email?: string | null,
  hasAuthenticatedUser = false
): string {
  const nextStep = resolveNextOnboardingStep(profile, isEmailConfirmed, hasAuthenticatedUser);

  if (nextStep === 2) return '/signUp?step=2';
  if (nextStep === 3) {
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    return `/signUp?step=3${emailParam}`;
  }
  if (nextStep === 1) return '/signUp';
  return '/';
}
