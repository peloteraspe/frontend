import { getEventsExplorer } from '@modules/events/api/queries/getEventsExplorer';
import CardEventItem from './CardEventItem';
import { log } from '@src/core/lib/logger';
import Link from 'next/link';
import LandingEventsMap from './LandingEventsMap';

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
  const cardEvents = typeof previewCount === 'number'
    ? featuredEvents.slice(0, previewCount)
    : featuredEvents;

  log.debug('Retrieved events for card list', 'CARD_EVENT_LIST', {
    featuredCount: featuredEvents.length,
    eventCount: cardEvents?.length,
  });

  return (
    <div className="pb-8 md:pb-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-inter">Partidos destacados</h2>
          <p className="mt-1 text-sm text-slate-600">Explora los encuentros destacados por nuestro equipo.</p>
        </div>
        {showViewAll && (
          <Link
            href="/events"
            className="inline-flex h-10 items-center rounded-lg border border-[#54086F] px-4 text-sm font-semibold text-[#54086F] hover:bg-[#54086F] hover:text-white transition"
          >
            Ver todos los partidos
          </Link>
        )}
      </div>

      {!cardEvents.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Aún no hay partidos destacados publicados.
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="order-2 xl:order-1 [&>div]:gap-5">
            <CardEventItem cardEvents={cardEvents} variant="landing" />
          </div>
          <div className="order-1 xl:order-2">
            <LandingEventsMap events={cardEvents} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CardEventList;
