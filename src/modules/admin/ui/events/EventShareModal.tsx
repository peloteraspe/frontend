'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import soccerBall from '@core/assets/soccer-ball.svg';
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

  useEffect(() => {
    if (!isOpen) setCopyMessage('');
  }, [isOpen]);

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
    } catch {
      setCopyMessage('No se pudo copiar automáticamente.');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 px-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200/90 bg-white/95 text-left shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-mulberry/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

        <button
          type="button"
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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

        <div className="relative border-b border-slate-200 px-6 pb-5 pt-6 text-left sm:px-7">
          <h3 className="mt-3 text-2xl font-black leading-tight text-slate-900">
            Compartir evento
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Envía tu enlace en segundos y completa los cupos más rápido.
          </p>
        </div>

        <div className="relative px-6 py-6 text-left sm:px-7">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left">
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
              <p className="mt-1 text-sm text-slate-600">
                Estamos preparando tu enlace para compartir.
              </p>
            </div>
          ) : status === 'error' ? (
            <div className="py-5">
              <p className="text-base font-semibold text-red-600">
                {message || 'No se pudo completar la operación.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 inline-flex h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Ir a eventos
              </button>
            </div>
          ) : (
            <div className="pt-4">
              <p className="text-base font-semibold text-emerald-700">
                {message || 'Evento creado con éxito. Ahora compártelo para que se inscriban.'}
              </p>

              <div className="mt-4 rounded-2xl border border-mulberry/20 bg-[#54086F]/5 p-4">
                <p className="text-sm font-semibold text-[#54086F]">Invitar jugadoras</p>
                <p className="mt-1 text-sm text-slate-700">
                  Comparte el enlace de inscripción del evento.
                </p>

                <div className="relative mt-3">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl || 'Enlace no disponible'}
                    className="h-11 w-full rounded-xl border-2 border-mulberry bg-white px-3 pr-12 text-sm text-slate-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="absolute inset-y-0 right-1 inline-flex h-9 w-9 my-auto items-center justify-center rounded-lg text-mulberry transition hover:bg-mulberry hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Copiar enlace del evento"
                    title="Copiar enlace"
                    disabled={!shareUrl}
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {whatsappShareUrl ? (
                    <a
                      href={whatsappShareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(37,211,102,0.9)] transition hover:bg-[#20be5c] hover:shadow-[0_14px_28px_-12px_rgba(32,190,92,0.95)] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
                    >
                      <WhatsappIcon className="h-4 w-4 shrink-0" />
                      Compartir por WhatsApp
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Ir a eventos
                  </button>
                </div>

                {copyMessage ? (
                  <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    {copyMessage}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
