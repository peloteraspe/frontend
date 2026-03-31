import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { redirect } from 'next/navigation';

import AdminRequestDetailScreen from '@modules/admin/api/requests/screens/AdminRequestDetailScreen';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

function parseId(value: string) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function Page({ params, searchParams }: Props) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isSuperAdmin(user as any)) {
    redirect('/admin');
  }

  const { id } = await params;
  const requestId = parseId(id);
  if (!requestId) {
    redirect('/admin/requests');
  }

  return <AdminRequestDetailScreen id={requestId} searchParams={await searchParams} />;
}
