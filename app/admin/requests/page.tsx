import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { redirect } from 'next/navigation';

import AdminRequestsScreen from '@modules/admin/api/requests/screens/AdminRequestsScreen';

type Props = {
  searchParams?: Promise<{
    status?: string;
    message?: string;
    error?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isSuperAdmin(user as any)) {
    redirect('/admin');
  }

  return <AdminRequestsScreen searchParams={await searchParams} />;
}
