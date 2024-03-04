import Header from '@/components/Header';
import PostsList from './posts-list';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import UpdateProfile from './update-profile';
import Hero from '@/components/layout/hero';

export default async function Index() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('user', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
    } else {
      userProfile = data;
    }
  }

  if (user && !userProfile) {
    return <UpdateProfile user={user} />;
  }
  return (
    <>
      {/* <div className="animate-in flex-1 flex flex-col gap-20 opacity-0 max-w-6xl px-3"> */}
      {/* <Header /> */}
      <Hero />
      <section>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="py-8 md:py-16">
            <div className="md:flex md:justify-between" data-sticky-container>
              <Sidebar />

              {/* Main content */}
              <div className="md:grow" id="main-content">
                <PostsList />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
