'use client';

import { useEffect, useState } from 'react';
import UsersBroadcastForm from '@modules/admin/ui/users/UsersBroadcastForm';

type Props = {
  defaultSubject: string;
  defaultBody: string;
  recipientCount: number;
};

export default function UsersBroadcastPanel({ defaultSubject, defaultBody, recipientCount }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-md bg-mulberry px-4 text-sm font-semibold text-white transition hover:bg-mulberry/90"
      >
        Enviar correo
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 px-4 py-4 backdrop-blur-[2px] sm:py-6"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="users-broadcast-modal-title"
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-left shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setIsOpen(false)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="max-h-[88vh] overflow-y-auto p-4 sm:p-6">
              <div className="mb-3 rounded-2xl border border-mulberry/20 bg-mulberry/5 px-4 py-3">
                <p id="users-broadcast-modal-title" className="text-sm font-semibold text-mulberry">
                  Comunicado a usuarias
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Redacta tu mensaje y envíalo a todas las usuarias con correo válido usando el template de Peloteras.
                </p>
              </div>

              <UsersBroadcastForm
                defaultSubject={defaultSubject}
                defaultBody={defaultBody}
                recipientCount={recipientCount}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
