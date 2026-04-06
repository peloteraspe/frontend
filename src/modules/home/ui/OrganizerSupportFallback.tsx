'use client';

import { useState } from 'react';
import { trackEvent } from '@shared/lib/analytics';
import PartnerLeadCaptureForm from '@modules/home/ui/PartnerLeadCaptureForm';

export default function OrganizerSupportFallback() {
  const [isOpen, setIsOpen] = useState(false);

  function handleToggle() {
    setIsOpen((current) => {
      const next = !current;
      if (next) {
        trackEvent('create_event_support_fallback_opened', {
          channel: 'web',
          source: 'organiza_con_peloteras',
        });
      }
      return next;
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">¿Prefieres ayuda humana?</p>
          <p className="mt-1 text-sm text-slate-700">
            El autoservicio es el camino principal. Si algo te frena, nuestro equipo puede ayudarte a activar
            tu perfil.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {isOpen ? 'Ocultar ayuda' : 'Necesito ayuda para activar'}
        </button>
      </div>

      {isOpen ? <PartnerLeadCaptureForm kind="admin" source="organizer_support_fallback" /> : null}
    </div>
  );
}
