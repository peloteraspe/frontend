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
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Aún no hay partidos destacados publicados.
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <div
          className="inline-flex rounded-2xl bg-slate-100 p-1"
          role="tablist"
          aria-label="Filtrar partidos destacados por estado"
        >
          <button
            type="button"
            role="tab"
            aria-selected={timeFilter === 'upcoming'}
            onClick={() => setTimeFilter('upcoming')}
            className={[
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
              timeFilter === 'upcoming'
                ? 'bg-mulberry text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            Próximos
            <span
              className={[
                'rounded-full px-2 py-0.5 text-xs',
                timeFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-white text-slate-600',
              ].join(' ')}
            >
              {upcomingEvents.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeFilter === 'past'}
            onClick={() => setTimeFilter('past')}
            className={[
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
              timeFilter === 'past'
                ? 'bg-mulberry text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            Pasados
            <span
              className={[
                'rounded-full px-2 py-0.5 text-xs',
                timeFilter === 'past' ? 'bg-white/20 text-white' : 'bg-white text-slate-600',
              ].join(' ')}
            >
              {pastEvents.length}
            </span>
          </button>
        </div>
      </div>

      {!visibleEvents.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          {timeFilter === 'upcoming'
            ? 'Aún no hay partidos destacados próximos.'
            : 'Aún no hay partidos destacados finalizados.'}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
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
