import { getEventsExplorer } from '@modules/events/api/queries/getEventsExplorer';
import CardEventItem from './CardEventItem';
import { log } from '@src/core/lib/logger';
import Link from 'next/link';
import LandingEventsMap from './LandingEventsMap';

type CardEventListProps = {
  previewCount?: number;
  showViewAll?: boolean;
};

const CardEventList = async ({ previewCount, showViewAll = true }: CardEventListProps) => {
  const events = await getEventsExplorer();
  const cardEvents = Array.isArray(events)
    ? typeof previewCount === 'number'
      ? events.slice(0, previewCount)
      : events
    : [];

  log.debug('Retrieved events for card list', 'CARD_EVENT_LIST', {
    eventCount: cardEvents?.length,
  });

  return (
    <div className="pb-8 md:pb-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-inter">Próximos partidos</h2>
          <p className="mt-1 text-sm text-slate-600">Explora todos los partidos disponibles y ubícalos en el mapa.</p>
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

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="order-2 xl:order-1">
          <CardEventItem cardEvents={cardEvents} variant="landing" />
        </div>
        <div className="order-1 xl:order-2">
          <LandingEventsMap events={cardEvents} />
        </div>
      </div>
    </div>
  );
};

export default CardEventList;
