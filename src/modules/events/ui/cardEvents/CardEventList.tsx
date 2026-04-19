import { getEventsExplorer } from '@modules/events/api/queries/getEventsExplorer';
import { log } from '@src/core/lib/logger';
import Link from 'next/link';
import FeaturedEventsClientEntry from './FeaturedEventsClientEntry';

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

  log.debug('Retrieved events for card list', 'CARD_EVENT_LIST', {
    featuredCount: featuredEvents.length,
    eventCount: featuredEvents.length,
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[39rem]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mulberry/75">
            Eventos destacados
          </p>
          <h2 className="mt-3 font-eastman-extrabold text-4xl leading-[1.02] text-slate-900 sm:text-5xl lg:text-[3rem]">
            Partidos y pichangas para volver a la cancha.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
            Explora las próximas pichangas en Peloteras y encuentra una oportunidad para jugar,
            conocer gente nueva y sumarte a la comunidad.
          </p>
        </div>
        {showViewAll && (
          <Link
            href="/events"
            className="group home-button-micro premium-outline inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-semibold text-[#54086F] hover:border-[#54086F] hover:bg-[#54086F] hover:text-white"
          >
            <span>Ver todos los eventos</span>
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

      <FeaturedEventsClientEntry events={featuredEvents} previewCount={previewCount} />
    </div>
  );
};

export default CardEventList;
