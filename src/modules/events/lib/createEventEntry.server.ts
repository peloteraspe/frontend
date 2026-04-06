import { getServerSupabase } from '@core/api/supabase.server';
import { resolveNextOnboardingStep } from '@modules/auth/lib/onboarding-state';
import { isAdmin } from '@shared/lib/auth/isAdmin';

type OnboardingProfileRow = {
  username?: string | null;
  level_id?: number | null;
  onboarding_step?: number | null;
  is_profile_complete?: boolean | null;
} | null;

function appendNextPath(path: string, nextPath: string) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}next=${encodeURIComponent(nextPath)}`;
}

function resolveProfileName(
  profile: OnboardingProfileRow,
  user: {
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  }
) {
  const profileName = String(profile?.username || '').trim();
  if (profileName) return profileName;

  const metadataName = String(
    user.user_metadata?.username || user.user_metadata?.full_name || ''
  ).trim();
  if (metadataName) return metadataName;

  const emailName = String(user.email || '').split('@')[0]?.trim();
  if (emailName) return emailName;

  return 'organizadora';
}

function resolveOrganizerPhone(user: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  return String(user.user_metadata?.organizer_phone || user.app_metadata?.organizer_phone || '').trim();
}

function resolveOnboardingRedirect(profile: OnboardingProfileRow, user: { email?: string | null; email_confirmed_at?: string | null }) {
  const nextStep = resolveNextOnboardingStep(profile, Boolean(user.email_confirmed_at), true);
  if (nextStep === null) return null;

  if (nextStep === 2) {
    return appendNextPath('/signUp?step=2', CREATE_EVENT_ENTRY_PATH);
  }

  if (nextStep === 3) {
    const emailParam = user.email ? `&email=${encodeURIComponent(user.email)}` : '';
    return appendNextPath(`/signUp?step=3${emailParam}`, CREATE_EVENT_ENTRY_PATH);
  }

  return appendNextPath('/signUp', CREATE_EVENT_ENTRY_PATH);
}

export const CREATE_EVENT_ENTRY_PATH = '/create-event';

export type CreateEventDraftSummary = {
  id: string;
  title: string;
  createdAt: string | null;
  startTime: string | null;
};

export type CreateEventEntryState =
  | {
      kind: 'redirect';
      destination: string;
    }
  | {
      kind: 'activation_required';
      initialPhone: string;
      profileName: string;
    }
  | {
      kind: 'dashboard';
      profileName: string;
      paymentMethodsReady: boolean;
      activePaymentMethodCount: number;
      draftCount: number;
      publishedEventCount: number;
      latestDraft: CreateEventDraftSummary | null;
    };

export async function resolveCreateEventEntryState(): Promise<CreateEventEntryState> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      kind: 'redirect',
      destination: `/login?next=${encodeURIComponent(CREATE_EVENT_ENTRY_PATH)}`,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profile')
    .select('username, level_id, onboarding_step, is_profile_complete')
    .eq('user', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const onboardingRedirect = resolveOnboardingRedirect(profile, user);
  if (onboardingRedirect) {
    return {
      kind: 'redirect',
      destination: onboardingRedirect,
    };
  }

  const profileName = resolveProfileName(profile, user);

  if (!isAdmin(user as any)) {
    return {
      kind: 'activation_required',
      initialPhone: resolveOrganizerPhone(user),
      profileName,
    };
  }

  const [paymentMethodsRes, latestDraftRes, draftCountRes, publishedCountRes] = await Promise.all([
    supabase
      .from('paymentMethod')
      .select('id')
      .eq('created_by', user.id)
      .eq('is_active', true),
    supabase
      .from('event')
      .select('id,title,created_at,start_time')
      .eq('created_by_id', user.id)
      .eq('is_published', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('event')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_id', user.id)
      .eq('is_published', false),
    supabase
      .from('event')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_id', user.id)
      .eq('is_published', true),
  ]);

  if (paymentMethodsRes.error) throw new Error(paymentMethodsRes.error.message);
  if (latestDraftRes.error) throw new Error(latestDraftRes.error.message);
  if (draftCountRes.error) throw new Error(draftCountRes.error.message);
  if (publishedCountRes.error) throw new Error(publishedCountRes.error.message);

  return {
    kind: 'dashboard',
    profileName,
    paymentMethodsReady: (paymentMethodsRes.data ?? []).length > 0,
    activePaymentMethodCount: (paymentMethodsRes.data ?? []).length,
    draftCount: draftCountRes.count ?? 0,
    publishedEventCount: publishedCountRes.count ?? 0,
    latestDraft: latestDraftRes.data
      ? {
          id: String(latestDraftRes.data.id),
          title: String(latestDraftRes.data.title || 'Borrador'),
          createdAt: latestDraftRes.data.created_at ?? null,
          startTime: latestDraftRes.data.start_time ?? null,
        }
      : null,
  };
}
