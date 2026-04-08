import { getServerSupabase } from '@core/api/supabase.server';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SubNav from '@modules/admin/ui/SubNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user as any)) {
    redirect('/');
  }

  return (
    <section className="w-full max-w-screen-xl mx-auto p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-mulberry">Administración</h1>
        <Link
          href="/admin/events/new"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-mulberry px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#470760] sm:w-auto"
        >
          Crear evento
        </Link>
      </div>
      <SubNav />
      {children}
    </section>
  );
}
