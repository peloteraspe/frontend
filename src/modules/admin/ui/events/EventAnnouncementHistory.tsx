'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import {
  type EventAnnouncementActionState,
  resendFailedEventAnnouncement,
} from '@modules/admin/api/events/communications/_actions';
import type { EventAnnouncementHistoryItem } from '@modules/admin/api/events/services/eventAnnouncementHistory.service';

type Props = {
  history: EventAnnouncementHistoryItem[];
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

function historyStatusLabel(status: EventAnnouncementHistoryItem['status']) {
  if (status === 'partial') return 'Con fallas';
  if (status === 'failed') return 'Fallido';
  return 'Completado';
}

function historyStatusClasses(status: EventAnnouncementHistoryItem['status']) {
  if (status === 'partial') return 'bg-amber-100 text-amber-800';
  if (status === 'failed') return 'bg-rose-100 text-rose-800';
  return 'bg-emerald-100 text-emerald-800';
}

function RetryButton({ disabled }: { disabled: boolean }) {
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
      {pending ? 'Reenviando...' : 'Reenviar fallidos'}
    </button>
  );
}

function ResendFailedForm({ announcementId }: { announcementId: number }) {
  const router = useRouter();
  const lastHandledMessageRef = useRef('');
  const [state, formAction] = useActionState(resendFailedEventAnnouncement, INITIAL_EVENT_ANNOUNCEMENT_ACTION_STATE);

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
      <input type="hidden" name="announcementId" value={announcementId} readOnly />
      <RetryButton disabled={false} />

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

export default function EventAnnouncementHistory({ history }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-mulberry">Historial de envíos</h3>
        <p className="text-sm text-slate-600">
          Aquí verás qué campañas salieron, cuáles fallaron y podrás reenviar solo las destinatarias pendientes.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Aún no hay campañas registradas para este evento.
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${historyStatusClasses(
                        item.status
                      )}`}
                    >
                      {historyStatusLabel(item.status)}
                    </span>
                    <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                    {item.sourceAnnouncementId ? (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                        Reenvío de #{item.sourceAnnouncementId}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.subject || 'Sin asunto'}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Total: {item.totalRecipients} · Enviados: {item.sentCount} · Fallidos: {item.failedCount}
                    </p>
                  </div>
                </div>

                <div className="md:min-w-[220px]">
                  {item.failedCount > 0 && item.canRetryFailed ? (
                    <ResendFailedForm announcementId={item.id} />
                  ) : item.failedCount > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      Este lote ya tuvo un reenvío registrado.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700">
                      No hubo destinatarias fallidas en esta campaña.
                    </div>
                  )}
                </div>
              </div>

              {item.failedRecipients.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-rose-100 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-rose-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                          Nombre
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                          Correo
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.failedRecipients.map((recipient) => (
                        <tr key={`${item.id}-${recipient.email}`} className="border-t border-rose-100">
                          <td className="px-3 py-2 text-slate-800">{recipient.name}</td>
                          <td className="px-3 py-2 text-slate-700">{recipient.email}</td>
                          <td className="px-3 py-2 text-slate-700">{recipient.errorMessage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
