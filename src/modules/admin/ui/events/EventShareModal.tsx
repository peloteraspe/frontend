'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import soccerBall from '@core/assets/soccer-ball.svg';

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 px-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-600 transition hover:bg-white hover:text-slate-900"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="bg-gradient-to-r from-mulberry to-[#7d2d8f] px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Peloteras</p>
          <h3 className="mt-1 text-2xl font-black">Compartir evento</h3>
          <p className="mt-1 text-sm text-white/85">
            Invita jugadoras en segundos y llena tu partido más rápido.
          </p>
        </div>

        <div className="px-6 py-6">
          {status === 'loading' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Image src={soccerBall} alt="Creando evento" width={52} height={52} className="animate-spin" />
              <p className="mt-4 text-lg font-bold text-slate-900">Creando evento...</p>
              <p className="mt-1 text-sm text-slate-600">Estamos preparando tu enlace para compartir.</p>
            </div>
          ) : status === 'error' ? (
            <div className="py-4">
              <p className="text-base font-semibold text-red-600">
                {message || 'No se pudo completar la operación.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Ir a eventos
              </button>
            </div>
          ) : (
            <div>
              <p className="text-base font-semibold text-emerald-700">
                {message || 'Evento creado con éxito. Ahora compártelo para que se inscriban.'}
              </p>

              <div className="mt-4 rounded-2xl border border-mulberry/20 bg-mulberry/5 p-4">
                <p className="text-sm font-semibold text-mulberry">Invitar jugadoras</p>
                <p className="mt-1 text-sm text-slate-700">Comparte el enlace de inscripción del evento.</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {whatsappShareUrl ? (
                    <a
                      href={whatsappShareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
                    >
                      Compartir por WhatsApp
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center rounded-xl border border-mulberry px-4 py-2 text-sm font-semibold text-mulberry hover:bg-mulberry hover:text-white"
                  >
                    Copiar enlace
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Ir a eventos
                  </button>
                </div>

                {shareUrl ? <p className="mt-3 break-all text-xs text-slate-600">{shareUrl}</p> : null}
                {copyMessage ? <p className="mt-2 text-xs text-emerald-700">{copyMessage}</p> : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
