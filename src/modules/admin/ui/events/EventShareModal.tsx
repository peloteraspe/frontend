'use client';

import Link from 'next/link';
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
  managementHref?: string;
  managementLabel?: string;
  onClose: () => void;
};

export default function EventShareModal({
  isOpen,
  status,
  eventTitle = 'Evento',
  message,
  shareUrl = '',
  managementHref = '/admin/events',
  managementLabel = 'Ir a la gestión del evento',
  onClose,
}: Props) {
  const [copyMessage, setCopyMessage] = useState('');

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
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] text-left ring-1 ring-slate-200/80 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-mulberry/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

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

        <div className="relative px-6 pb-5 pt-6 text-left sm:px-7">
          <span className="inline-flex items-center rounded-xl bg-mulberry/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-mulberry ring-1 ring-mulberry/10">
            Cierre del flujo
          </span>
          <h3 className="mt-3 text-2xl font-black leading-tight text-slate-900">Evento listo para moverse</h3>
          <p className="mt-1 text-sm text-slate-600">
            Cierra el flujo compartiendo ahora o vuelve a la gestión para seguir optimizando cupos.
          </p>
        </div>

        <div className="relative px-6 py-6 text-left sm:px-7">
          <div className="grid gap-3 sm:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-[16px] bg-white/80 px-4 py-3 text-left ring-1 ring-slate-200/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Evento</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{eventTitle || 'Evento'}</p>
            </div>
            <div className="rounded-[16px] bg-emerald-50/85 px-4 py-3 text-left ring-1 ring-emerald-200/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Objetivo ahora</p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">
                {status === 'success' ? 'Mover inscripciones rápido' : 'Cerrar la creación sin fricción'}
              </p>
            </div>
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
                className="mt-4 inline-flex h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Ir a eventos
              </button>
            </div>
          ) : (
            <div className="pt-4">
              <p className="text-base font-semibold text-emerald-700">
                {message || 'Evento creado con éxito. Este es el mejor momento para empezar a compartirlo.'}
              </p>

              <div className="mt-4 rounded-[18px] bg-[#54086F]/5 p-4 ring-1 ring-mulberry/12">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#54086F]">Comparte antes de salir del flujo</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Mientras la motivación está alta, envía el enlace y abre la gestión del evento para seguir afinándolo.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200/70">
                    Meta inmediata: primeras inscritas
                  </div>
                </div>

                <div className="relative mt-4">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl || 'Enlace no disponible'}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pr-12 text-sm text-slate-700 focus:border-mulberry focus:outline-none focus:ring-4 focus:ring-mulberry/10"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="absolute inset-y-0 right-1 my-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-mulberry transition hover:bg-mulberry hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Copiar enlace del evento"
                    title="Copiar enlace"
                    disabled={!shareUrl}
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
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
                      className="group inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#25D366] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(37,211,102,0.9)] transition hover:bg-[#20be5c] hover:shadow-[0_14px_28px_-12px_rgba(32,190,92,0.95)] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
                    >
                      <WhatsappIcon className="h-4 w-4 shrink-0" />
                      Compartir por WhatsApp
                    </a>
                  ) : null}
                  {shareUrl ? (
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        trackEvent('create_event_share_channel_clicked', {
                          channel: 'web',
                          share_channel: 'open_public_event',
                        });
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300/90 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-white"
                    >
                      Abrir evento público
                    </a>
                  ) : null}
                  <Link
                    href={managementHref}
                    onClick={() => {
                      trackEvent('create_event_share_channel_clicked', {
                        channel: 'web',
                        share_channel: 'manage_event',
                      });
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300/90 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-white"
                  >
                    {managementLabel}
                  </Link>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Cerrar y volver
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[14px] bg-white/82 px-3 py-3 ring-1 ring-white/70">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Paso 1</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Comparte el enlace</p>
                    <p className="mt-1 text-xs text-slate-600">WhatsApp y copiar enlace siguen siendo tus canales más rápidos.</p>
                  </div>
                  <div className="rounded-[14px] bg-white/82 px-3 py-3 ring-1 ring-white/70">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Paso 2</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Revisa la gestión</p>
                    <p className="mt-1 text-xs text-slate-600">Vuelve al evento para ajustar detalles si ves que algo puede convertir mejor.</p>
                  </div>
                  <div className="rounded-[14px] bg-white/82 px-3 py-3 ring-1 ring-white/70">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Paso 3</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Empieza a llenar cupos</p>
                    <p className="mt-1 text-xs text-slate-600">Lo que sigue ya no es crear: es mover la convocatoria con claridad.</p>
                  </div>
                </div>

                {copyMessage ? (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
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
