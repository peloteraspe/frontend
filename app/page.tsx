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
