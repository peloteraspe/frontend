'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import {
  sendEventAnnouncement,
  type EventAnnouncementActionState,
} from '@modules/admin/api/events/communications/_actions';

type Props = {
  eventId: string;
  defaultSubject: string;
  defaultBody: string;
  recipientCount: number;
};

const INITIAL_EVENT_ANNOUNCEMENT_ACTION_STATE: EventAnnouncementActionState = {
  status: 'idle',
  message: '',
  sentCount: 0,
  failedCount: 0,
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={[
        'inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition',
        disabled || pending
          ? 'cursor-not-allowed bg-slate-400'
          : 'bg-mulberry hover:bg-mulberry/90',
      ].join(' ')}
    >
      {pending ? 'Enviando...' : 'Enviar correo'}
    </button>
  );
}

export default function EventAnnouncementForm({
  eventId,
  defaultSubject,
  defaultBody,
  recipientCount,
}: Props) {
  const router = useRouter();
  const lastHandledMessageRef = useRef('');
  const [state, formAction] = useActionState(sendEventAnnouncement, INITIAL_EVENT_ANNOUNCEMENT_ACTION_STATE);
  const canSend = recipientCount > 0;

  useEffect(() => {
    if (!state.message || state.message === lastHandledMessageRef.current) return;
    if (state.sentCount + state.failedCount <= 0) return;

    lastHandledMessageRef.current = state.message;
    startTransition(() => {
      router.refresh();
    });
  }, [router, state.failedCount, state.message, state.sentCount]);

  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="eventId" value={eventId} readOnly />

      <div className="mb-4 flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-mulberry">Enviar correo a inscritas</h3>
        <p className="text-sm text-slate-600">
          Tu mensaje se enviará con el template oficial a las inscritas con pago pendiente o aprobado.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-1">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destinatarias</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{recipientCount}</p>
        </div>
      </div>

      {recipientCount === 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No hay inscritas activas con correo para este evento.
        </div>
      ) : null}

      <div className="mt-4">
        <label htmlFor="event-announcement-subject" className="mb-2 block text-sm font-semibold text-slate-800">
          Asunto
        </label>
        <input
          id="event-announcement-subject"
          name="subject"
          type="text"
          defaultValue={defaultSubject}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-mulberry focus:ring-2 focus:ring-mulberry/20"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="event-announcement-body" className="mb-2 block text-sm font-semibold text-slate-800">
          Contenido
        </label>
        <textarea
          id="event-announcement-body"
          name="body"
          defaultValue={defaultBody}
          rows={16}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-mulberry focus:ring-2 focus:ring-mulberry/20"
        />
        <p className="mt-2 text-xs text-slate-500">
          Las líneas que empiecen con <code>⚽</code>, <code>•</code> o <code>-</code> se enviarán como lista.
        </p>
      </div>

      {state.status !== 'idle' ? (
        <div
          className={[
            'mt-4 rounded-xl px-4 py-3 text-sm',
            state.status === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border border-rose-200 bg-rose-50 text-rose-900',
          ].join(' ')}
        >
          <p>{state.message}</p>
          {state.status === 'success' ? (
            <p className="mt-1 text-xs">
              Enviados: {state.sentCount} · Fallidos: {state.failedCount}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Se enviará inmediatamente desde <strong>contacto@peloteras.com</strong>.
        </p>
        <SubmitButton disabled={!canSend} />
      </div>
    </form>
  );
}
