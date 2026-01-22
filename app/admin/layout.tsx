import { cookies } from 'next/headers';
import { getServerSupabase } from '@src/core/api/supabase.server';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import { redirect } from 'next/navigation';
import SubNav from './_components/SubNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user as any)) {
    redirect('/');
  }

  return (
    <section className="w-full max-w-screen-xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold text-mulberry mb-4">Administración</h1>
      <SubNav />
      {children}
    </section>
  );
}
