import { getServerSupabase } from '@src/core/api/supabase.server';
import { cookies } from 'next/headers';
import UpdateProfile from './signUp/signUpForm';

import CardEventList from '@modules/events/ui/cardEvents/CardEventList';
// import { getFeatures } from '@/lib/data/getFeatures';
// import { getEvents } from '@/lib/data/getEvents';
import { log } from '../src/core/lib/logger';
import MainSection from '@src/modules/home/ui/MainSection';

export default async function Index() {
  // Await cookies() so that cookieStore holds the resolved cookies object.

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    const { data, error } = await supabase.from('profile').select('*').eq('user', user.id).single();

    if (error) {
      log.database('SELECT user profile', 'profile', error, { userId: user.id });
    } else {
      userProfile = data;
    }
  }

  if (user && !userProfile) {
    return <UpdateProfile user={user} />;
  }

  // const features = await getFeatures();
  // const events = await getEvents();

  return (
    <>
      {/* <div className="animate-in flex-1 flex flex-col gap-20 opacity-0 max-w-6xl px-3"> */}
      {/* <Header /> */}
      <MainSection />
      <section className="md:max-w-screen-md lg:max-w-screen-md xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-8 md:py-16 flex justify-between w-full">
        <div className="md:flex md:justify-between w-full" data-sticky-container>
          {/* <Sidebar features={features} events={events} /> */}

          {/* Main content */}
          <div className="w-full">
            <CardEventList />
          </div>
          <div className="md:w-96"></div>
        </div>
      </section>
    </>
  );
}
