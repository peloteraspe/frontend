'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import {
  type EventAnnouncementActionState,
  resendHistoricalBouncedEmail,
} from '@modules/admin/api/events/communications/_actions';
import type { ResendSentEmailHistoryItem } from '@modules/admin/api/events/services/resendSentEmailHistory.service';

type Props = {
  history: ResendSentEmailHistoryItem[];
  hasMore: boolean;
  limit: number;
  currentPage: number;
  cursorHistory: string[];
};

const INITIAL_EVENT_ANNOUNCEMENT_ACTION_STATE: EventAnnouncementActionState = {
  status: 'idle',
  message: '',
  sentCount: 0,
  failedCount: 0,
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function eventLabel(lastEvent: string) {
  const normalized = String(lastEvent || '').trim().toLowerCase();
  if (normalized === 'delivered') return 'Entregado';
  if (normalized === 'opened') return 'Abierto';
  if (normalized === 'clicked') return 'Clic';
  if (normalized === 'bounced') return 'Rebotado';
  if (normalized === 'complaint') return 'Reportado';
  if (normalized === 'complained') return 'Reportado';
  if (normalized === 'suppressed') return 'Suprimido';
  if (normalized === 'delivery_delayed') return 'Demorado';
  if (normalized === 'failed') return 'Fallido';
  if (normalized === 'canceled') return 'Cancelado';
  if (normalized === 'sent') return 'Enviado';
  return normalized || 'Sin evento';
}

function eventClasses(lastEvent: string) {
  const normalized = String(lastEvent || '').trim().toLowerCase();
  if (
    normalized === 'bounced' ||
    normalized === 'complaint' ||
    normalized === 'complained' ||
    normalized === 'failed' ||
    normalized === 'suppressed'
  ) {
    return 'bg-rose-100 text-rose-800';
  }
  if (normalized === 'delivery_delayed' || normalized === 'sent') return 'bg-amber-100 text-amber-800';
  if (normalized === 'opened' || normalized === 'clicked') return 'bg-sky-100 text-sky-800';
  return 'bg-slate-100 text-slate-800';
}

function buildCommunicationsHref(cursorHistory: string[]) {
  if (!cursorHistory.length) return '/admin/communications';

  const query = new URLSearchParams();
  const currentCursor = cursorHistory[cursorHistory.length - 1];
  query.set('cursor', currentCursor);
  query.set('history', cursorHistory.join(','));

  return `/admin/communications?${query.toString()}`;
}

function RetryBouncedButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={[
        'inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition',
        disabled || pending ? 'cursor-not-allowed bg-slate-400' : 'bg-mulberry hover:bg-mulberry/90',
      ].join(' ')}
    >
      {pending ? 'Reenviando...' : 'Reenviar rebotado'}
    </button>
  );
}

function ResendBouncedForm({ emailId }: { emailId: string }) {
  const router = useRouter();
  const lastHandledMessageRef = useRef('');
  const [state, formAction] = useActionState(resendHistoricalBouncedEmail, INITIAL_EVENT_ANNOUNCEMENT_ACTION_STATE);

  useEffect(() => {
    if (!state.message || state.message === lastHandledMessageRef.current) return;
    if (state.sentCount + state.failedCount <= 0) return;

    lastHandledMessageRef.current = state.message;
    startTransition(() => {
      router.refresh();
    });
  }, [router, state.failedCount, state.message, state.sentCount]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="emailId" value={emailId} readOnly />
      <RetryBouncedButton disabled={false} />

      {state.status !== 'idle' ? (
        <div
          className={[
            'rounded-xl px-3 py-2 text-xs',
            state.status === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border border-rose-200 bg-rose-50 text-rose-900',
          ].join(' ')}
        >
          <p>{state.message}</p>
          {state.status === 'success' ? (
            <p className="mt-1">
              Enviados: {state.sentCount} · Fallidos: {state.failedCount}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

export default function ResendSentEmailHistory({ history, hasMore, limit, currentPage, cursorHistory }: Props) {
  const lastEmailId = history.length ? history[history.length - 1].id : '';
  const hasPreviousPage = cursorHistory.length > 0;
  const previousCursorHistory = hasPreviousPage ? cursorHistory.slice(0, -1) : [];
  const previousHref = hasPreviousPage ? buildCommunicationsHref(previousCursorHistory) : null;
  const nextCursorHistory = hasMore && lastEmailId ? [...cursorHistory, lastEmailId] : null;
  const nextHref = nextCursorHistory ? buildCommunicationsHref(nextCursorHistory) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-mulberry">Histórico desde Resend</h3>
          <p className="text-sm text-slate-600">
            Aquí ves correos reales de Resend. Si un correo quedó rebotado y tenía una sola destinataria, podrás
            reenviar solo ese envío; cuando no aplique, el estado te mostrará el motivo.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Página {currentPage} · {history.length} correos
          <span className="text-slate-500"> · hasta {limit} por página</span>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          No se encontraron correos históricos en Resend para mostrar aquí.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Fecha
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Asunto
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Para
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Estado
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(item.createdAt)}</td>
                  <td className="px-3 py-2 text-slate-900">{item.subject || 'Sin asunto'}</td>
                  <td className="px-3 py-2 text-slate-700">{item.to.join(', ') || 'Sin destinatarias'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        title={item.retryDisabledReason || undefined}
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eventClasses(item.lastEvent)}`}
                      >
                        {eventLabel(item.lastEvent)}
                      </span>
                      {item.retryDisabledReason ? (
                        <span
                          title={item.retryDisabledReason}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500"
                          aria-label={item.retryDisabledReason}
                        >
                          i
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {item.canRetryBounced ? (
                      <ResendBouncedForm emailId={item.id} />
                    ) : (
                      <span className="text-xs text-slate-500" title={item.retryDisabledReason || undefined}>
                        No reenviable
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">La paginación recorre todo el histórico disponible en Resend.</p>
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
