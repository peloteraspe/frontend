import { redirect } from 'next/navigation';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { listResendEmails } from '@modules/admin/api/communications/services/resendEmails.service';
import { getGlobalEventAnnouncementHistory } from '@modules/admin/api/events/services/eventAnnouncementHistory.service';
import ResendEmailList from '@modules/admin/ui/communications/ResendEmailList';
import EventAnnouncementHistory from '@modules/admin/ui/events/EventAnnouncementHistory';

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

export default async function CommunicationsAdminPage({ searchParams }: Props) {
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

  const [resendEmails, history] = await Promise.all([
    listResendEmails({ after: currentCursor }),
    getGlobalEventAnnouncementHistory(),
  ]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-mulberry">Correos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vista global para superadmin. Arriba ves el listado real de Resend con paginación; abajo queda el historial
          interno de campañas de eventos y sus reintentos.
        </p>
      </div>

      <ResendEmailList
        emails={resendEmails.emails}
        hasMore={resendEmails.hasMore}
        currentPage={currentPage}
        cursorHistory={cursorHistory}
        limit={resendEmails.limit}
        errorMessage={resendEmails.errorMessage}
      />

      <EventAnnouncementHistory
        history={history}
        title="Historial interno de campañas"
        description="Incluye campañas persistidas por Peloteras. El botón de reenvío solo intenta nuevamente las destinatarias fallidas de cada envío."
        showEventContext
      />
    </div>
  );
}
