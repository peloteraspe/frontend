import { redirect } from 'next/navigation';

import { getServerSupabase } from '@core/api/supabase.server';
import { sanitizeNextPath } from '@modules/auth/lib/redirect';
import {
  type EventProfileIntent,
  hasCompleteEventProfile,
  resolveStoredBirthDate,
} from '@modules/users/lib/eventProfileRequirements';
import EventProfileCompletionGateway from '@modules/users/ui/EventProfileCompletionGateway';
import { resolveStoredPhone } from '@shared/lib/phone';

type PageSearchParams = {
  next?: string;
  intent?: string;
};

function resolveIntent(value: string | undefined): EventProfileIntent {
  return value === 'create_event' ? 'create_event' : 'join_event';
}

function resolveCancelPath(intent: EventProfileIntent, nextPath: string) {
  if (intent === 'create_event') return '/events';

  const eventMatch = /^\/(?:payments|versus)\/([^/?#]+)/.exec(nextPath);
  return eventMatch ? `/events/${eventMatch[1]}` : '/events';
}

export const dynamic = 'force-dynamic';

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const intent = resolveIntent(resolvedSearchParams?.intent);
  const nextPath =
    sanitizeNextPath(resolvedSearchParams?.next) ||
    (intent === 'create_event' ? '/create-event' : '/events');
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = `/complete-profile?${new URLSearchParams({
      next: nextPath,
      intent,
    }).toString()}`;
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  if (hasCompleteEventProfile(user)) {
    redirect(nextPath);
  }

  return (
    <EventProfileCompletionGateway
      intent={intent}
      nextPath={nextPath}
      cancelPath={resolveCancelPath(intent, nextPath)}
      initialPhone={resolveStoredPhone(user)}
      initialBirthDate={resolveStoredBirthDate(user)}
    />
  );
}
