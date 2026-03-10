import Link from 'next/link';
import type { ResendEmailListItem } from '@modules/admin/api/communications/services/resendEmails.service';

type Props = {
  emails: ResendEmailListItem[];
  hasMore: boolean;
  currentPage: number;
  cursorHistory: string[];
  limit: number;
  errorMessage: string | null;
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function translateEventStatus(value: string | null) {
  if (!value) return 'Sin evento';

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === 'queued') return 'En cola';
  if (normalizedValue === 'scheduled') return 'Programado';
  if (normalizedValue === 'sent') return 'Enviado';
  if (normalizedValue === 'delivered') return 'Entregado';
  if (normalizedValue === 'opened') return 'Abierto';
  if (normalizedValue === 'clicked') return 'Clic';
  if (normalizedValue === 'bounced') return 'Rebotado';
  if (normalizedValue === 'complaint') return 'Queja';
  if (normalizedValue === 'complained') return 'Queja';
  if (normalizedValue === 'canceled') return 'Cancelado';
  if (normalizedValue === 'failed') return 'Fallido';

  return value;
}

function eventStatusClasses(value: string | null) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (['delivered', 'opened', 'clicked'].includes(normalizedValue)) return 'bg-emerald-100 text-emerald-800';
  if (['queued', 'scheduled', 'sent'].includes(normalizedValue)) return 'bg-amber-100 text-amber-800';
  if (['bounced', 'complaint', 'complained', 'canceled', 'failed'].includes(normalizedValue)) {
    return 'bg-rose-100 text-rose-800';
  }
  return 'bg-slate-200 text-slate-700';
}

function formatRecipients(recipients: string[]) {
  if (!recipients.length) return 'Sin destinatarias';
  if (recipients.length === 1) return recipients[0];
  if (recipients.length === 2) return `${recipients[0]}, ${recipients[1]}`;

  return `${recipients[0]}, ${recipients[1]} +${recipients.length - 2}`;
}

function buildCommunicationsHref(cursorHistory: string[]) {
  if (!cursorHistory.length) return '/admin/communications';

  const query = new URLSearchParams();
  const currentCursor = cursorHistory[cursorHistory.length - 1];
  query.set('cursor', currentCursor);
  query.set('history', cursorHistory.join(','));

  return `/admin/communications?${query.toString()}`;
}

export default function ResendEmailList({
  emails,
  hasMore,
  currentPage,
  cursorHistory,
  limit,
  errorMessage,
}: Props) {
  const lastEmailId = emails.length ? emails[emails.length - 1].id : '';
  const hasPreviousPage = cursorHistory.length > 0;
  const previousCursorHistory = hasPreviousPage ? cursorHistory.slice(0, -1) : [];
  const previousHref = hasPreviousPage ? buildCommunicationsHref(previousCursorHistory) : null;
  const nextCursorHistory = hasMore && lastEmailId ? [...cursorHistory, lastEmailId] : null;
  const nextHref = nextCursorHistory ? buildCommunicationsHref(nextCursorHistory) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-mulberry">Correos de Resend</h2>
          <p className="mt-1 text-sm text-slate-600">
            Se muestra el listado real de correos enviados por Resend. Esta vista usa cursor para recorrer todo el
            historial.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Página {currentPage} · {emails.length} correos
          <span className="text-slate-500"> · hasta {limit} por página</span>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && emails.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          No hay correos para mostrar en esta página.
        </div>
      ) : null}

      {emails.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Asunto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Destinatarias
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Remitente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  ID
                </th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr
                  key={email.id || `${email.createdAt}-${email.subject}-${email.from}`}
                  className="border-t border-slate-200 align-top"
                >
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDateTime(email.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="min-w-[220px]">
                      <p className="font-medium text-slate-900">{email.subject || 'Sin asunto'}</p>
                      {email.replyTo.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">Reply-to: {formatRecipients(email.replyTo)}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="min-w-[240px]">
                      <p>{formatRecipients(email.to)}</p>
                      {email.cc.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">CC: {formatRecipients(email.cc)}</p>
                      ) : null}
                      {email.bcc.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">BCC: {formatRecipients(email.bcc)}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eventStatusClasses(
                        email.lastEvent
                      )}`}
                    >
                      {translateEventStatus(email.lastEvent)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="break-all">{email.from || 'Sin remitente'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <span className="break-all">{email.id || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Usa los controles para recorrer todo el historial disponible en Resend.
        </p>
        <div className="flex items-center gap-2">
          {previousHref ? (
            <Link
              href={previousHref}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Anterior
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-400">
              Anterior
            </span>
          )}

          {nextHref ? (
            <Link
              href={nextHref}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-mulberry px-4 text-sm font-semibold text-white transition hover:bg-mulberry/90"
            >
              Siguiente
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-500">
              Siguiente
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
