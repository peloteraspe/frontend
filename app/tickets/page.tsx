import { enforceOnboardingGuard } from '@modules/auth/lib/onboarding.server';
import TicketsPage from '@modules/tickets/ui/TicketsPage';

export default async function Page() {
  const { user } = await enforceOnboardingGuard({ requireAuth: true });

  return <TicketsPage userId={user!.id} />;
}
