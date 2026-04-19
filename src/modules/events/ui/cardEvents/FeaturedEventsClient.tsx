'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

import { hasEventEnded } from '@modules/events/lib/eventTiming';
import { EventEntity } from '@modules/events/model/types';

import CardEventItem from './CardEventItem';
const LandingEventsMap = dynamic(() => import('./LandingEventsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 md:h-[520px]" />
  ),
});

type Props = {
  events: EventEntity[];
  previewCount?: number;
};

type TimeFilter = 'upcoming' | 'past';

export default function FeaturedEventsClient({ events, previewCount }: Props) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');

  const upcomingEvents = useMemo(
    () => events.filter((event) => !hasEventEnded(event.endTime, undefined, event.startTime)),
    [events]
  );

  const pastEvents = useMemo(
    () => events.filter((event) => hasEventEnded(event.endTime, undefined, event.startTime)),
    [events]
  );

  const visibleEvents = useMemo(() => {
    const filteredEvents = timeFilter === 'upcoming' ? upcomingEvents : pastEvents;
    return typeof previewCount === 'number' ? filteredEvents.slice(0, previewCount) : filteredEvents;
  }, [pastEvents, previewCount, timeFilter, upcomingEvents]);

  if (!events.length) {
    return (
      <div className="premium-card px-6 py-6 text-sm text-slate-600">
        Aún no hay fechas destacadas publicadas.
      </div>
    );
  }

  return (
    <>
      <div className="mb-5">
        <div className="premium-tab-group" role="tablist" aria-label="Filtrar partidos destacados por estado">
          <button
            type="button"
            role="tab"
            aria-selected={timeFilter === 'upcoming'}
            onClick={() => setTimeFilter('upcoming')}
            data-active={timeFilter === 'upcoming'}
            className="premium-tab-button"
          >
            Próximos
            <span className="premium-tab-count">
              {upcomingEvents.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeFilter === 'past'}
            onClick={() => setTimeFilter('past')}
            data-active={timeFilter === 'past'}
            className="premium-tab-button"
          >
            Pasados
            <span className="premium-tab-count">
              {pastEvents.length}
            </span>
          </button>
        </div>
      </div>

      {!visibleEvents.length ? (
        <div className="premium-card px-6 py-6 text-sm text-slate-600">
          {timeFilter === 'upcoming'
            ? 'Aún no hay fechas destacadas próximas.'
            : 'Aún no hay fechas destacadas finalizadas.'}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="order-2 xl:order-1 [&>div]:gap-5">
            <CardEventItem cardEvents={visibleEvents} variant="landing" />
          </div>
          <div className="order-1 xl:order-2">
            <LandingEventsMap events={visibleEvents} />
          </div>
        </div>
      )}
    </>
  );
}
