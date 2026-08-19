import { getServerSupabase } from '@core/api/supabase.server';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import { redirect } from 'next/navigation';
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
    <section className="site-shell py-4 md:py-6">
      <SubNav />
      {children}
    </section>
  );
}
