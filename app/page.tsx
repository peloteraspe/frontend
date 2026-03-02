import ComingSoonLanding from '@modules/home/ui/ComingSoonLanding';

export default function Index() {
  return <ComingSoonLanding />;
}
// import { getServerSupabase } from '@core/api/supabase.server';
// import { log } from '@core/lib/logger';
// import { redirect } from 'next/navigation';

// import CardEventList from '@modules/events/ui/cardEvents/CardEventList';
// import MainSection from '@modules/home/ui/MainSection';
// import { getOnboardingDestination } from '@modules/auth/lib/onboarding-state';

// export default async function Index() {
//   const supabase = await getServerSupabase();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   let userProfile:
//     | {
//         username?: string | null;
//         level_id?: number | null;
//         onboarding_step?: number | null;
//         is_profile_complete?: boolean | null;
//       }
//     | null = null;

//   if (user) {
//     const { data, error } = await supabase
//       .from('profile')
//       .select('username, level_id, onboarding_step, is_profile_complete')
//       .eq('user', user.id)
//       .maybeSingle();
//     if (error) log.database('SELECT user profile', 'profile', error, { userId: user.id });
//     else userProfile = data;
//   }

//   if (user) {
//     const onboardingDestination = getOnboardingDestination(
//       userProfile,
//       Boolean(user.email_confirmed_at),
//       user.email,
//       true
//     );

//     if (onboardingDestination !== '/') {
//       redirect(onboardingDestination);
//     }
//   }

//   return (
//     <>
//       <MainSection />
//       <section className="md:max-w-screen-md lg:max-w-screen-md xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-8 md:py-16 flex justify-between w-full">
//         <div className="md:flex md:justify-between w-full" data-sticky-container>
//           <div className="w-full">
//             <CardEventList />
//           </div>
//           <div className="md:w-96" />
//         </div>
//       </section>
//     </>
//   );
// }
