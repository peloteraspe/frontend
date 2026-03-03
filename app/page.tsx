import ComingSoonLanding from '@modules/home/ui/ComingSoonLanding';

export default function Index() {
  return <ComingSoonLanding />;
}
// import { getServerSupabase } from '@core/api/supabase.server';
// import { log } from '@core/lib/logger';

// import CardEventList from '@modules/events/ui/cardEvents/CardEventList';
// import MainSection from '@modules/home/ui/MainSection';
// import CompleteProfileClient from '@modules/users/ui/complete-profile/CompleteProfileClient';

// export default async function Index() {
//   const supabase = await getServerSupabase();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   let userProfile = null;

//   if (user) {
//     const { data, error } = await supabase.from('profile').select('*').eq('user', user.id).single();
//     if (error) log.database('SELECT user profile', 'profile', error, { userId: user.id });
//     else userProfile = data;
//   }

//   if (user && !userProfile) {
//     return <CompleteProfileClient userId={user.id} />;
//   }

//   return (
//     <>
//       <MainSection />
//       <section className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-10 py-8 md:py-12">
//         <div className="w-full" data-sticky-container>
//           <div className="w-full">
//             <CardEventList />
//           </div>
//         </div>
//       </section>
//     </>
//   );
// }
