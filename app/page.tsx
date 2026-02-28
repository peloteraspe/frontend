// import ComingSoonLanding from '@modules/home/ui/ComingSoonLanding';

// export default function Index() {
//   return <ComingSoonLanding />;
// }
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';

import CardEventList from '@modules/events/ui/cardEvents/CardEventList';
import MainSection from '@modules/home/ui/MainSection';
import CompleteProfileClient from '@modules/users/ui/complete-profile/CompleteProfileClient';

function isProfileComplete(profile: { username?: string | null; level_id?: number | null } | null) {
  if (!profile) return false;
  const hasUsername = typeof profile.username === 'string' && profile.username.trim().length >= 3;
  const hasLevel = typeof profile.level_id === 'number';
  return hasUsername && hasLevel;
}

export default async function Index() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile: { username?: string | null; level_id?: number | null } | null = null;

  if (user) {
    const { data, error } = await supabase
      .from('profile')
      .select('username, level_id')
      .eq('user', user.id)
      .maybeSingle();
    if (error) log.database('SELECT user profile', 'profile', error, { userId: user.id });
    else userProfile = data;
  }

  if (user && !isProfileComplete(userProfile)) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const initialUsername =
      (typeof metadata.username === 'string' && metadata.username.trim()) ||
      (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
      (user.email ? user.email.split('@')[0] : '');

    return <CompleteProfileClient userId={user.id} initialUsername={initialUsername} />;
  }

  return (
    <>
      <MainSection />
      <section className="md:max-w-screen-md lg:max-w-screen-md xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-8 md:py-16 flex justify-between w-full">
        <div className="md:flex md:justify-between w-full" data-sticky-container>
          <div className="w-full">
            <CardEventList />
          </div>
          <div className="md:w-96" />
        </div>
      </section>
    </>
  );
}
