'use client';

import { CatalogOption } from '@modules/events/model/types';
import {
  DEFAULT_EVENT_TIMEZONE,
  formatTimeInTimeZoneWithMeridiem,
  getIsoDateInTimeZone,
  normalizeDateTimeLocalToLima,
} from '@shared/lib/dateTime';
import RichTextContent from '@shared/ui/RichTextContent';

type EventPreviewProps = {
  title?: string;
  description?: string;
  descriptionHtml?: string;
  startTime?: string;
  endTime?: string;
  district?: string;
  placeText?: string;
  locationText?: string;
  price?: number;
  minUsers?: number;
  maxUsers?: number;
  eventType?: CatalogOption;
  level?: CatalogOption;
  isTeamEvent?: boolean;
  teamCount?: number;
  teamPlayers?: number;
  teamSubstitutes?: number;
  teamPriceMode?: 'per_player' | 'fixed_team';
  fixedTeamPrice?: number;
  wantsToPublish?: boolean;
  isReadyToPublish?: boolean;
};

const PREVIEW_DATE_FORMATTER = new Intl.DateTimeFormat('es-PE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: DEFAULT_EVENT_TIMEZONE,
});

function parsePreviewDateTime(value: string | undefined) {
  const normalized = normalizeDateTimeLocalToLima(value);
  if (!normalized) return null;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatPreviewRange(startDate: Date | null, endDate: Date | null) {
  if (!startDate) return '';
  const startLabel = `${PREVIEW_DATE_FORMATTER.format(startDate)}, ${formatTimeInTimeZoneWithMeridiem(
    startDate,
    DEFAULT_EVENT_TIMEZONE
  )}`;
  if (!endDate) return startLabel;

  const endLabel =
    getIsoDateInTimeZone(startDate) === getIsoDateInTimeZone(endDate)
      ? formatTimeInTimeZoneWithMeridiem(endDate, DEFAULT_EVENT_TIMEZONE)
      : `${PREVIEW_DATE_FORMATTER.format(endDate)}, ${formatTimeInTimeZoneWithMeridiem(
          endDate,
          DEFAULT_EVENT_TIMEZONE
        )}`;

  return `${startLabel} - ${endLabel}`;
}

export default function EventPreview({
  title = 'Tu evento',
  description,
  descriptionHtml,
  startTime,
  endTime,
  district,
  placeText,
  locationText,
  price,
  minUsers,
  maxUsers,
  eventType,
  level,
  isTeamEvent = false,
  teamCount = 2,
  teamPlayers = 7,
  teamSubstitutes = 0,
  teamPriceMode = 'per_player',
  fixedTeamPrice,
  wantsToPublish,
  isReadyToPublish,
}: EventPreviewProps) {
  const hasDefinedPrice = typeof price === 'number' && Number.isFinite(price);
  const hasFixedTeamPrice =
    isTeamEvent &&
    teamPriceMode === 'fixed_team' &&
    typeof fixedTeamPrice === 'number' &&
    Number.isFinite(fixedTeamPrice);
  const priceDisplay = hasFixedTeamPrice
    ? fixedTeamPrice === 0
      ? 'Gratis por equipo'
      : `S/ ${fixedTeamPrice.toFixed(2)} por equipo`
    : hasDefinedPrice
      ? price === 0
        ? 'Gratis'
        : `S/ ${price.toFixed(2)}${isTeamEvent ? ' por jugadora' : ''}`
      : 'A definir';
  const capacityDisplay = isTeamEvent
    ? `${teamCount} equipos`
    : maxUsers
      ? `${minUsers || 0}-${maxUsers} jugadoras`
      : 'Sin límite';
  const isIncomplete = !title || !startTime || !locationText;
  const startDate = parsePreviewDateTime(startTime);
  const endDate = parsePreviewDateTime(endTime);
  const scheduleLabel = formatPreviewRange(startDate, endDate);

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
              wantsToPublish && isReadyToPublish
                ? 'bg-emerald-100 text-emerald-800'
                : wantsToPublish
                  ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600',
            ].join(' ')}
          >
            {wantsToPublish
              ? isReadyToPublish
                ? 'Lista para publicar'
                : 'Publicación pendiente'
              : 'Borrador'}
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

        <RichTextContent
          html={descriptionHtml}
          text={description}
          emptyText="Aquí verás cómo se va armando el copy de tu evento mientras completas el formulario."
          className="mt-4 text-sm leading-6 text-slate-600"
        />
      </div>

      <div className="space-y-3 px-5 py-5 sm:px-6">
        {isTeamEvent ? (
          <div className="rounded-2xl border border-mulberry/15 bg-mulberry/[0.035] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mulberry/70">
                  Equipos participantes
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {teamPlayers} titulares
                  {teamSubstitutes > 0 ? ` + hasta ${teamSubstitutes} suplentes` : ' · sin suplentes'} por equipo
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-mulberry ring-1 ring-mulberry/15">
                0/{teamCount} equipos
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: Math.min(teamCount, 6) }, (_, index) => (
                <div key={index} className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-center text-xs font-medium text-slate-500">
                  Equipo {index + 1}
                </div>
              ))}
              {teamCount > 6 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold text-slate-600">
                  +{teamCount - 6} lugares
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {startTime ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Fecha y hora
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">{scheduleLabel}</p>
          </div>
        ) : null}

        {locationText ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ubicación
            </p>
            {placeText ? (
              <p className="mt-2 text-sm font-semibold text-slate-900">{placeText}</p>
            ) : null}
            <p className={`${placeText ? 'mt-1' : 'mt-2'} text-sm font-medium text-slate-900`}>
              {locationText}
            </p>
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
