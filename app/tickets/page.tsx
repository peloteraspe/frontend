import { redirect } from 'next/navigation';
import { getServerSupabase } from '@core/api/supabase.server';
import TicketsPage from '@modules/tickets/ui/TicketsPage';

export default async function Page() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <TicketsPage userId={user.id} />;
}
