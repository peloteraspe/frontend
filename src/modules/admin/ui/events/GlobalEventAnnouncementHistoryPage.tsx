import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getGlobalEventAnnouncementHistory } from '@modules/admin/api/events/services/eventAnnouncementHistory.service';
import EventAnnouncementHistory from '@modules/admin/ui/events/EventAnnouncementHistory';
import ResendSentEmailHistory from '@modules/admin/ui/events/ResendSentEmailHistory';
import { getResendSentEmailHistory } from '@modules/admin/api/events/services/resendSentEmailHistory.service';
import { redirect } from 'next/navigation';

type SearchParams = {
  cursor?: string | string[];
  history?: string | string[];
};

type Props = {
  searchParams?: SearchParams;
};

function readSingleValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeCursor(value?: string | null) {
  const normalizedValue = String(value || '').trim();
  return normalizedValue || null;
}

function getCursorHistory(searchParams?: SearchParams) {
  const historyValue = readSingleValue(searchParams?.history);
  const cursorValue = normalizeCursor(readSingleValue(searchParams?.cursor));
  const history = String(historyValue || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (cursorValue && history[history.length - 1] !== cursorValue) {
    history.push(cursorValue);
  }

  return history;
}

export default async function GlobalEventAnnouncementHistoryPage({ searchParams }: Props) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user as any)) {
    redirect('/admin');
  }

  const cursorHistory = getCursorHistory(searchParams);
  const currentCursor = cursorHistory.length ? cursorHistory[cursorHistory.length - 1] : null;
  const currentPage = cursorHistory.length + 1;
  const [history, resendHistory] = await Promise.all([
    getGlobalEventAnnouncementHistory(),
    getResendSentEmailHistory({
      after: currentCursor,
      limit: 100,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-mulberry">Correos de eventos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Vista global para superadmin. Puedes revisar campañas de todos los eventos, reenviar fallidos locales y
          reenviar correos rebotados que ya quedaron registrados en Resend.
        </p>
      </div>

      <ResendSentEmailHistory
        history={resendHistory.items}
        hasMore={resendHistory.hasMore}
        limit={resendHistory.limit}
        currentPage={currentPage}
        cursorHistory={cursorHistory}
      />

      <EventAnnouncementHistory
        history={history}
        title="Historial global"
        description="Incluye campañas de todos los eventos. El botón de reenvío solo intenta nuevamente las destinatarias fallidas de cada envío."
        showEventContext
      />
    </div>
  );
}
