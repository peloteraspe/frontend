'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import {
  sendEventPromotionToAllPlayers,
  type EventAnnouncementActionState,
} from '@modules/admin/api/events/communications/_actions';

type Props = {
  eventId: string;
  eventTitle: string;
  recipientCount: number;
  buttonClassName?: string;
  onOpen?: () => void;
};

const INITIAL_EVENT_PROMOTION_ACTION_STATE: EventAnnouncementActionState = {
  status: 'idle',
  message: '',
  sentCount: 0,
  failedCount: 0,
};

function formatRecipientLabel(count: number) {
  return `${count} jugadora${count === 1 ? '' : 's'}`;
}

function ConfirmButton({ disabled, recipientCount }: { disabled: boolean; recipientCount: number }) {
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
      {pending ? 'Enviando...' : `Sí, enviar a ${formatRecipientLabel(recipientCount)}`}
    </button>
  );
}

export default function EventPromotionQuickAction({
  eventId,
  eventTitle,
  recipientCount,
  buttonClassName,
  onOpen,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const lastHandledSuccessRef = useRef('');
  const [state, formAction] = useActionState(
    sendEventPromotionToAllPlayers,
    INITIAL_EVENT_PROMOTION_ACTION_STATE
  );
  const canSend = recipientCount > 0;

  function handleClose() {
    setIsOpen(false);

    if (state.status !== 'idle') {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (state.status !== 'success' || !state.message || state.message === lastHandledSuccessRef.current) return;

    lastHandledSuccessRef.current = state.message;
    const timer = window.setTimeout(() => {
      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router, state.message, state.status]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setIsOpen(true);
        }}
        disabled={!canSend}
        className={[
          buttonClassName || 'text-mulberry hover:underline',
          'disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline',
        ].join(' ')}
      >
        Promocionar
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 px-4 py-4 backdrop-blur-[2px] sm:py-6"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-promotion-modal-title"
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-left shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={handleClose}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-mulberry/20 bg-mulberry/5 px-4 py-3">
                <p id="event-promotion-modal-title" className="text-sm font-semibold text-mulberry">
                  Enviar correo de promoción
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Se enviará la plantilla automática de promoción de <strong>{eventTitle}</strong> a todas las
                  jugadoras con correo registrado.
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Destinatarias estimadas
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{recipientCount}</p>
                <p className="mt-1 text-sm text-slate-600">
                  El envío saldrá inmediatamente desde <strong>contacto@peloteras.com</strong>.
                </p>
              </div>

              {!canSend ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  No hay jugadoras con correo válido para enviar esta promoción.
                </div>
              ) : null}

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
                  {(state.sentCount > 0 || state.failedCount > 0) && (
                    <p className="mt-1 text-xs">
                      Enviados: {state.sentCount} · Fallidos: {state.failedCount}
                    </p>
                  )}
                </div>
              ) : null}

              <form action={formAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <input type="hidden" name="eventId" value={eventId} readOnly />

                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <ConfirmButton disabled={!canSend} recipientCount={recipientCount} />
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
