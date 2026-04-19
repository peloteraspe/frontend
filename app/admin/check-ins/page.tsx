import { redirect } from 'next/navigation';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getCheckinEventOptions } from '@modules/checkins/api/services/checkins.service';
import CheckinsAdminPage from '@modules/checkins/ui/admin/CheckinsAdminPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isSuperAdmin(user as any)) {
    redirect('/admin');
  }

  const eventOptions = await getCheckinEventOptions();
  return <CheckinsAdminPage eventOptions={eventOptions} />;
}
