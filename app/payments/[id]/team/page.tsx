import { notFound, redirect } from 'next/navigation';
import TeamEventRegistrationForm from '@modules/teams/ui/TeamEventRegistrationForm';
import {
  getTeamRegistrationPageData,
  TEAM_REGISTRATION_AUTH_REQUIRED,
  TEAM_REGISTRATION_NOT_AVAILABLE,
  TEAM_REGISTRATION_PROFILE_REQUIRED,
} from '@modules/teams/api/services/teamEventRegistration.service';
import { buildEventProfileCompletionPath } from '@modules/users/lib/eventProfileRequirements';

export default async function TeamPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await getTeamRegistrationPageData(id);
    return (
      <main className="site-shell w-full py-6 sm:py-10">
        <TeamEventRegistrationForm event={data.event} teams={data.teams} paymentMethods={data.paymentMethods} />
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === TEAM_REGISTRATION_AUTH_REQUIRED) redirect(`/login?next=${encodeURIComponent(`/payments/${id}/team`)}`);
    if (message === TEAM_REGISTRATION_PROFILE_REQUIRED) redirect(buildEventProfileCompletionPath({ nextPath: `/payments/${id}/team`, intent: 'join_event' }));
    if (message === TEAM_REGISTRATION_NOT_AVAILABLE) redirect(`/events/${id}`);
    notFound();
  }
}
