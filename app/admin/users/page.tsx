import UsersAdminScreen from '@src/modules/admin/api/users/screens/UsersAdminScreen';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isSuperAdmin(user as any)) {
    redirect('/admin');
  }

  return <UsersAdminScreen />;
}
