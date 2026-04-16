import { getEventsExplorer } from '@modules/events/api/queries/getEventsExplorer';
import { hasEventEnded } from '@modules/events/lib/eventTiming';
import { log } from '@src/core/lib/logger';
import Link from 'next/link';
import { formattedPrice } from '@shared/lib/utils';

type CardEventListProps = {
  previewCount?: number;
  showViewAll?: boolean;
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError: Error) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        if (timer) clearTimeout(timer);
        reject(timeoutError);
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

const CardEventList = async ({ previewCount, showViewAll = true }: CardEventListProps) => {
  let events: Awaited<ReturnType<typeof getEventsExplorer>> = [];
  try {
    events = await withTimeout(
      getEventsExplorer(),
      4500,
      new Error('CardEventList getEventsExplorer timeout')
    );
  } catch (error) {
    log.warn('Landing events query timed out; using empty featured list fallback', 'CARD_EVENT_LIST', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const featuredEvents = Array.isArray(events) ? events.filter((event) => event.isFeatured) : [];
  const upcomingFeaturedEvents = featuredEvents.filter(
    (event) => !hasEventEnded(event.endTime, undefined, event.startTime)
  );
  const pastFeaturedEvents = featuredEvents.filter((event) =>
    hasEventEnded(event.endTime, undefined, event.startTime)
  );
  const visibleEvents = (
    upcomingFeaturedEvents.length > 0 ? upcomingFeaturedEvents : pastFeaturedEvents
  ).slice(0, previewCount ?? 4);

  log.debug('Retrieved events for card list', 'CARD_EVENT_LIST', {
    featuredCount: featuredEvents.length,
    eventCount: featuredEvents.length,
  });

  return (
    <div className="pb-8 md:pb-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[39rem]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry/75">
            Eventos destacados
          </p>
          <h2 className="mt-3 font-eastman-extrabold text-3xl leading-[1.02] text-slate-900 sm:text-4xl lg:text-[2.75rem]">
            Pichangas y partidos listos para sumarte.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Explora pichangas, partidos y encuentros destacados publicados en Peloteras.
          </p>
        </div>
        {showViewAll && (
          <Link
            href="/events"
            className="group home-button-micro inline-flex h-10 items-center gap-2 rounded-lg border border-[#54086F] px-4 text-sm font-semibold text-[#54086F] hover:bg-[#54086F] hover:text-white"
          >
            <span>Ver todos los partidos</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        )}
      </div>

      {visibleEvents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Aún no hay partidos destacados publicados.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visibleEvents.map((event) => {
            const isPastEvent = hasEventEnded(event.endTime, undefined, event.startTime);

            return (
              <article
                key={event.id}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.45)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-mulberry/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mulberry">
                    {event.levelName || 'Sin nivel'}
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {event.eventTypeName || 'Partido'}
                  </span>
                  {isPastEvent ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                      Finalizado
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 font-eastman-bold text-2xl leading-tight text-slate-900">
                  {event.title || 'Evento sin título'}
                </h3>

                <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                  <p>{event.dateLabel || 'Fecha por confirmar'}</p>
                  <p>{event.locationText || 'Ubicación por confirmar'}</p>
                </div>

                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Desde
                    </p>
                    <p className="mt-1 font-eastman-extrabold text-3xl leading-none text-mulberry">
                      {formattedPrice(Number(event.price ?? 0))}
                    </p>
                  </div>

                  <Link
                    href={`/events/${event.id}`}
                    className="home-button-micro inline-flex h-11 items-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white hover:bg-[#470760]"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CardEventList;
