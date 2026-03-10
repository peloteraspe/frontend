import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getGlobalEventAnnouncementHistory } from '@modules/admin/api/events/services/eventAnnouncementHistory.service';
import EventAnnouncementHistory from '@modules/admin/ui/events/EventAnnouncementHistory';
import ResendSentEmailHistory from '@modules/admin/ui/events/ResendSentEmailHistory';
import { getResendSentEmailHistory } from '@modules/admin/api/events/services/resendSentEmailHistory.service';
import { redirect } from 'next/navigation';

export default async function GlobalEventAnnouncementHistoryPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user as any)) {
    redirect('/admin');
  }

  const history = await getGlobalEventAnnouncementHistory();
  const resendHistory = await getResendSentEmailHistory();

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-mulberry">Correos de eventos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Vista global para superadmin. Puedes revisar campañas de todos los eventos, reenviar fallidos locales y
          reenviar correos rebotados que ya quedaron registrados en Resend.
        </p>
      </div>

      <EventAnnouncementHistory
        history={history}
        title="Historial global"
        description="Incluye campañas de todos los eventos. El botón de reenvío solo intenta nuevamente las destinatarias fallidas de cada envío."
        showEventContext
      />

      <ResendSentEmailHistory history={resendHistory.items} hasMore={resendHistory.hasMore} limit={resendHistory.limit} />
    </div>
  );
}
