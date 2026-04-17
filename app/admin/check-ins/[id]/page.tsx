import { notFound, redirect } from 'next/navigation';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getAdminCheckinDetail } from '@modules/checkins/api/services/checkins.service';
import CheckinDetailPage from '@modules/checkins/ui/admin/CheckinDetailPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isSuperAdmin(user as any)) {
    redirect('/admin');
  }

  const checkin = await getAdminCheckinDetail(id);
  if (!checkin) {
    notFound();
  }

  return <CheckinDetailPage checkin={checkin} />;
}
