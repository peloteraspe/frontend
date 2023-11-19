import DeployButton from '../components/DeployButton';
import AuthButton from '../components/AuthButton';
import { createClient } from '@/utils/supabase/server';
import ConnectSupabaseSteps from '@/components/ConnectSupabaseSteps';
import SignUpUserSteps from '@/components/SignUpUserSteps';
import Header from '@/components/Header';
import { cookies } from 'next/headers';
import Image from 'next/image';

export default async function Index({
  searchParams,
}: {
  searchParams: { code: string };
}) {
  const { code } = searchParams;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const canInitSupabaseClient = async () => {
    if (!code) return false;
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code) as any;
      cookieStore.set('sb:token', data?.session.access_token);
      return !error && !!data;
    } catch (e) {
      return false;
    }
  };

  const isSupabaseClientInitialized = await canInitSupabaseClient();

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
          <Image src="/logo.png" width={32} height={32} alt="Peloteras logo" />
          {!isSupabaseClientInitialized && <AuthButton />}
        </div>
      </nav>

      <div className="animate-in flex-1 flex flex-col gap-20 opacity-0 max-w-4xl px-3">
        <Header />
        <main className="flex-1 flex flex-col gap-6">
          <h2 className="font-bold text-4xl mb-4">Next steps</h2>
          {!isSupabaseClientInitialized ? (
            <SignUpUserSteps />
          ) : (
            <ConnectSupabaseSteps />
          )}
        </main>
      </div>

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
    </div>
  );
}
