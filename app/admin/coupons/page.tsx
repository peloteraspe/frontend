import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { redirect } from 'next/navigation';
import CouponsAdminPage from '@src/modules/admin/ui/coupons/CouponsAdminPage';
import { type CouponEventOption } from '@src/modules/admin/ui/coupons/CreateCouponForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_TIMEZONE = 'America/Lima';

function formatEventOptionLabel(title: string, startTime: string | null) {
  const cleanTitle = String(title || '').trim() || 'Evento sin título';
  if (!startTime) return cleanTitle;

  const parsed = new Date(startTime);
  if (Number.isNaN(parsed.getTime())) return cleanTitle;

  const formatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  });

  return `${cleanTitle} · ${formatter.format(parsed)}`;
}

export default async function Page() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isSuperAdmin(user as any)) {
    redirect('/admin');
  }

  const { data: events, error: eventsError } = await supabase
    .from('event')
    .select('id,title,start_time')
    .order('start_time', { ascending: false });

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const eventOptions: CouponEventOption[] = (events ?? []).map((event) => {
    const title = String(event.title || '').trim() || `Evento #${event.id}`;

    return {
      id: String(event.id),
      title,
      label: formatEventOptionLabel(title, event.start_time ?? null),
    };
  });

  return <CouponsAdminPage eventOptions={eventOptions} />;
}
