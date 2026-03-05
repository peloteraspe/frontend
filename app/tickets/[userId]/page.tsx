import { redirect } from 'next/navigation';
import { enforceOnboardingGuard } from '@modules/auth/lib/onboarding.server';
import TicketsPage from '@modules/tickets/ui/TicketsPage';

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function Page({ params }: Props) {
  const { user } = await enforceOnboardingGuard({ requireAuth: true });
  const { userId } = await params;

  if (userId !== user!.id) {
    redirect(`/tickets/${user!.id}`);
  }

  return <TicketsPage userId={userId} />;
}
