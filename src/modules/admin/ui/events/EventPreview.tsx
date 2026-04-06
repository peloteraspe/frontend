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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-4">
        Vista previa del evento
      </p>

      <div className="mb-6">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 line-clamp-2">
            {title || 'Tu evento aquí'}
          </h3>
          {isPublished && (
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full whitespace-nowrap">
              🟢 Publicado
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {eventType && (
            <span className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full">
              {eventType.name}
            </span>
          )}
          {level && (
            <span className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full">
              📊 {level.name}
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm text-slate-600 line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {startTime && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1">
            Fecha y hora
          </p>
          <p className="text-sm font-medium text-slate-900">
            📅 {formatDateTime(startTime)}
            {endTime && ` - ${formatDateTime(endTime).split(' ')[formatDateTime(endTime).split(' ').length - 1]}`}
          </p>
        </div>
      )}

      {locationText && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1">
            Ubicación
          </p>
          <p className="text-sm font-medium text-slate-900">📍 {locationText}</p>
          {district && <p className="text-xs text-slate-600 mt-1">{district}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1">
            Precio
          </p>
          <p className="text-sm font-medium text-slate-900">{priceDisplay}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1">
            Capacidad
          </p>
          <p className="text-sm font-medium text-slate-900">👥 {capacityDisplay}</p>
        </div>
      </div>

      {!title || !startTime || !locationText ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs text-amber-900">
            ⏳ Tu evento está tomando forma. Completa todos los detalles para publicar.
          </p>
        </div>
      ) : null}
    </div>
  );
}
