'use client';

import { CatalogOption } from '@modules/events/model/types';

type EventPreviewProps = {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  district?: string;
  locationText?: string;
  price?: number;
  minUsers?: number;
  maxUsers?: number;
  eventType?: CatalogOption;
  level?: CatalogOption;
  isPublished?: boolean;
};

export default function EventPreview({
  title = 'Tu evento',
  description,
  startTime,
  endTime,
  district,
  locationText,
  price,
  minUsers,
  maxUsers,
  eventType,
  level,
  isPublished,
}: EventPreviewProps) {
  const formatDateTime = (value: string | undefined) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toLocaleDateString('es-PE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const priceDisplay = price ? `S/ ${price.toFixed(2)}` : 'A definir';
  const capacityDisplay = maxUsers ? `${minUsers || 0}-${maxUsers} jugadoras` : 'Sin límite';
  const isIncomplete = !title || !startTime || !locationText;
  const endTimeLabel = endTime
    ? formatDateTime(endTime).split(' ')[formatDateTime(endTime).split(' ').length - 1]
    : '';

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.32)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.92))] px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Vista previa
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
              {title || 'Tu evento aquí'}
            </h3>
          </div>
          <span
            className={[
              'inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold',
              isPublished
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600',
            ].join(' ')}
          >
            {isPublished ? 'Publicado' : 'Borrador'}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {eventType ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {eventType.name}
            </span>
          ) : null}
          {level ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {level.name}
            </span>
          ) : null}
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          {description || 'Aquí verás cómo se va armando el copy de tu evento mientras completas el formulario.'}
        </p>
      </div>

      <div className="space-y-3 px-5 py-5 sm:px-6">
        {startTime ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Fecha y hora
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {formatDateTime(startTime)}
              {endTimeLabel ? ` - ${endTimeLabel}` : ''}
            </p>
          </div>
        ) : null}

        {locationText ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ubicación
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">{locationText}</p>
            {district ? <p className="mt-1 text-xs text-slate-500">{district}</p> : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Precio
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{priceDisplay}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Capacidad
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{capacityDisplay}</p>
          </div>
        </div>

        {isIncomplete ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium text-amber-900">
              Completa título, horario y ubicación para que esta preview se parezca al resultado final.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
