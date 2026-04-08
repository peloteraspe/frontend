'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import soccerBall from '@core/assets/soccer-ball.svg';
import { trackEvent } from '@shared/lib/analytics';
import WhatsappIcon from '@shared/ui/icons/social/WhatsappIcon';

export type EventShareModalStatus = 'loading' | 'success' | 'error';

type Props = {
  isOpen: boolean;
  status: EventShareModalStatus;
  eventTitle?: string;
  message?: string;
  shareUrl?: string;
  onClose: () => void;
};

export default function EventShareModal({
  isOpen,
  status,
  eventTitle = 'Evento',
  message,
  shareUrl = '',
  onClose,
}: Props) {
  const [copyMessage, setCopyMessage] = useState('');
  const canClose = status !== 'loading';

  useEffect(() => {
    if (!isOpen) setCopyMessage('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || status !== 'success') return;
    trackEvent('create_event_share_viewed', {
      channel: 'web',
      has_share_url: Boolean(shareUrl),
    });
  }, [isOpen, shareUrl, status]);

  const whatsappShareUrl = useMemo(() => {
    if (!shareUrl) return '';
    const text = `Te invito a inscribirte a mi evento en Peloteras: ${eventTitle}\n${shareUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [eventTitle, shareUrl]);

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMessage('Enlace copiado.');
      trackEvent('create_event_share_channel_clicked', {
        channel: 'web',
        share_channel: 'copy_link',
      });
    } catch {
      setCopyMessage('No se pudo copiar automáticamente.');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 px-4 backdrop-blur-[2px]"
      onClick={() => {
        if (canClose) onClose();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (canClose && (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ')) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] text-left ring-1 ring-slate-200/80 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-mulberry/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

        {canClose ? (
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}

        <div className="relative px-6 py-6 text-left sm:px-7">
          <h3 className="text-2xl font-black leading-tight text-slate-900">
            {status === 'loading'
              ? 'Creando evento...'
              : status === 'error'
                ? 'No pudimos crear el evento'
                : 'Evento creado'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {status === 'loading'
              ? 'Estamos preparando todo para que puedas compartirlo.'
              : status === 'error'
                ? 'Tu información sigue en el formulario para que puedas revisarla e intentarlo otra vez.'
                : message || 'Tu evento quedó listo. Compártelo ahora para empezar a llenar cupos.'}
          </p>

          <div className="mt-5 rounded-[16px] bg-white/85 px-4 py-3 text-left ring-1 ring-slate-200/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Evento
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{eventTitle || 'Evento'}</p>
          </div>

          {status === 'loading' ? (
            <div className="flex flex-col items-start justify-center py-8 text-left">
              <Image
                src={soccerBall}
                alt="Creando evento"
                width={52}
                height={52}
                className="animate-spin"
              />
              <p className="mt-4 text-lg font-bold text-slate-900">Creando evento...</p>
              <p className="mt-1 text-sm text-slate-600">Esto tarda solo unos segundos.</p>
            </div>
          ) : status === 'error' ? (
            <div className="mt-5 rounded-[18px] border border-red-200 bg-red-50/85 p-4">
              <p className="text-base font-semibold text-red-700">
                {message || 'Hubo un problema al crear el evento. Inténtalo otra vez.'}
              </p>
              <p className="mt-1 text-sm text-red-700/80">
                Si el problema continúa, vuelve a intentar en unos segundos.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Volver al formulario
              </button>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[20px] border border-mulberry/15 bg-[linear-gradient(135deg,rgba(84,8,111,0.09),rgba(255,255,255,0.98)_58%,rgba(84,8,111,0.04))] p-4 shadow-[0_18px_42px_-32px_rgba(84,8,111,0.45)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mulberry/70">
                    Compartir ahora
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Mueve tu convocatoria desde aquí
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Enlace del evento
                </p>
                <div className="relative mt-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl || 'Enlace no disponible'}
                    className="h-12 w-full rounded-[18px] border border-mulberry/15 bg-white/95 px-4 pr-14 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] outline-none transition focus:border-mulberry focus:ring-4 focus:ring-mulberry/10"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="absolute inset-y-0 right-1 my-auto inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-mulberry/15 bg-mulberry/5 text-mulberry transition hover:bg-mulberry hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Copiar enlace del evento"
                    title="Copiar enlace"
                    disabled={!shareUrl}
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {whatsappShareUrl ? (
                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      trackEvent('create_event_share_channel_clicked', {
                        channel: 'web',
                        share_channel: 'whatsapp',
                      });
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white shadow-[0_14px_24px_-18px_rgba(37,211,102,0.95)] transition hover:bg-[#20be5c]"
                  >
                    <WhatsappIcon className="h-4 w-4 shrink-0" />
                    Compartir por WhatsApp
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-mulberry/20 bg-white/90 px-4 text-sm font-semibold text-mulberry transition hover:bg-mulberry/6"
                  disabled={!shareUrl}
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  Copiar enlace
                </button>
              </div>

              {copyMessage ? (
                <p className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  {copyMessage}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
