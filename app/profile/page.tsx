import { enforceOnboardingGuard } from '@modules/auth/lib/onboarding.server';
import ProfilePage from '@modules/users/ui/profile/ProfilePage';

export default async function Page() {
  await enforceOnboardingGuard({ requireAuth: true });
  return <ProfilePage />;
}
