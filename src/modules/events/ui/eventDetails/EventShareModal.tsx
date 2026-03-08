'use client';

import { ClipboardDocumentIcon, ShareIcon } from '@heroicons/react/24/outline';

type Props = {
  isOpen: boolean;
  eventTitle: string;
  whatsappShareUrl: string;
  copyFeedback?: string;
  onCopyLink: () => void;
  onNativeShare: () => void;
  onWhatsappClick?: () => void;
  onClose: () => void;
};

export default function EventShareModal({
  isOpen,
  eventTitle,
  whatsappShareUrl,
  copyFeedback = '',
  onCopyLink,
  onNativeShare,
  onWhatsappClick,
  onClose,
}: Props) {
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
        className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Cerrar"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-2xl font-extrabold text-slate-900">Compartir evento</h3>
        <p className="mt-1 text-sm text-slate-600">Invita a tus amigas y completen cupos juntas.</p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Evento</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{eventTitle || 'Evento'}</p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onNativeShare}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ShareIcon className="h-4 w-4" />
            Compartir
          </button>

          <button
            type="button"
            onClick={onCopyLink}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-btnBg-light px-4 text-sm font-semibold text-btnBg-light transition hover:bg-btnBg-light hover:text-white"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            Copiar enlace
          </button>

          {whatsappShareUrl ? (
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onWhatsappClick}
              className="sm:col-span-2 inline-flex h-11 items-center justify-center rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:bg-[#20be5c]"
            >
              Compartir por WhatsApp
            </a>
          ) : null}
        </div>

        {copyFeedback ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            {copyFeedback}
          </p>
        ) : null}
      </div>
    </div>
  );
}
