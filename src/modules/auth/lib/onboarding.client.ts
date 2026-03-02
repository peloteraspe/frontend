import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getBrowserSupabase } from '@core/api/supabase.browser';
import { log } from '@core/lib/logger';

import {
  getOnboardingDestination,
  resolveNextOnboardingStep,
  type OnboardingProfileState,
} from './onboarding-state';

type CurrentOnboardingState = {
  user: User | null;
  profile: OnboardingProfileState;
  nextStep: 1 | 2 | 3 | null;
  destination: string;
};

export async function fetchCurrentOnboardingState(
  supabase: SupabaseClient = getBrowserSupabase()
): Promise<CurrentOnboardingState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      nextStep: 1,
      destination: '/login',
    };
  }

  const { data: profile, error } = await supabase
    .from('profile')
    .select('username, level_id, onboarding_step, is_profile_complete')
    .eq('user', user.id)
    .maybeSingle();

  if (error) {
    log.warn(
      'Could not read onboarding profile state, falling back to step resolution by auth',
      'onboarding',
      { error, userId: user.id }
    );
  }

  const safeProfile = error ? null : profile;
  const nextStep = resolveNextOnboardingStep(safeProfile, Boolean(user.email_confirmed_at), true);

  return {
    user,
    profile: safeProfile,
    nextStep,
    destination: getOnboardingDestination(
      safeProfile,
      Boolean(user.email_confirmed_at),
      user.email,
      true
    ),
  };
}

export async function getCurrentOnboardingDestination(
  supabase: SupabaseClient = getBrowserSupabase()
) {
  const state = await fetchCurrentOnboardingState(supabase);
  return state.destination;
}
