import VerifiedPlayerScreen from '@modules/admin/ui/events/screens/VerifiedPlayerScreen';
import { getServerSupabase } from '@core/api/supabase.server';
import { buildVerifiedPlayerPath } from '@modules/tickets/lib/verifiedPlayerQr';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import { redirect } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(buildVerifiedPlayerPath(id, userId))}`);
  }

  if (!isAdmin(user as any)) {
    redirect('/');
  }

  return <VerifiedPlayerScreen id={id} userId={userId} />;
}
