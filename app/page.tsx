// import ComingSoonLanding from '@modules/home/ui/ComingSoonLanding';

// export default function Index() {
//   return <ComingSoonLanding />;
// }
import { enforceOnboardingGuard } from '@modules/auth/lib/onboarding.server';

import CardEventList from '@modules/events/ui/cardEvents/CardEventList';
import MainSection from '@modules/home/ui/MainSection';

export default async function Index() {
  await enforceOnboardingGuard();

  return (
    <>
      <MainSection />
      <section className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-10 py-8 md:py-12">
        <div className="w-full" data-sticky-container>
          <div className="w-full">
            <CardEventList />
          </div>
        </div>
      </section>
    </>
  );
}
