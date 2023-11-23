import AuthButton from '../components/AuthButton';
import Header from '@/components/Header';
import Image from 'next/image';
import PostsList from './posts-list';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import UpdateProfile from './update-profile';

export default async function Index() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    user &&
    !user.user_metadata?.playerPosition &&
    !user.user_metadata?.username
  ) {
    return (
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 text-sm">
            <Image
              src="/logo.png"
              width={32}
              height={32}
              alt="Peloteras logo"
            />
            <AuthButton
              username={user.user_metadata?.username}
              isLogged={true}
            />
          </div>
        </nav>

        <section>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="py-8">
              <div className="md:flex md:justify-between" data-sticky-container>
                {/* Main content */}
                <div className="md:grow">
                  <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div
                      className="md:flex md:justify-between"
                      data-sticky-container
                    >
                      <div className="md:grow">
                        <div className="max-w-3xl mx-auto">
                          <div className="text-center">
                            <h1 className="text-4xl font-bold">
                              ¡Bienvenida a Peloteras!
                            </h1>
                            <p className="mt-4 text-md">
                              Para poder continuar, necesitamos que completes tu
                              perfil.
                            </p>
                          </div>
                          <UpdateProfile email={user.email} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
  return (
    <>
      {/* <div className="animate-in flex-1 flex flex-col gap-20 opacity-0 max-w-6xl px-3"> */}
      <Header />
      <section>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="py-8 md:py-16">
            <div className="md:flex md:justify-between" data-sticky-container>
              <Sidebar />

              {/* Main content */}
              <div className="md:grow">
                <PostsList />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* </div> */}

      <footer className="w-full border-t border-t-foreground/10 p-8 flex justify-center text-center text-xs">
        <p>
          Powered by{' '}
          <a
            href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            Supabase
          </a>
        </p>
      </footer>
    </>
  );
}
