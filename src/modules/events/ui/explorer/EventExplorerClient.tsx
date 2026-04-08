'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@core/auth/AuthProvider';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import Input from '@core/ui/Input';
import SelectComponent, { OptionSelect } from '@core/ui/SelectComponent';
import { hasEventStarted } from '@modules/events/lib/eventTiming';
import { CatalogOption, EventEntity } from '@modules/events/model/types';
import { trackEvent } from '@shared/lib/analytics';
import { isAdmin as isAdminUser } from '@shared/lib/auth/isAdmin';
import EventsMap from './EventsMap';
import EventListPanel from './EventListPanel';

type Props = {
  initialEvents: EventEntity[];
  initialCatalogs: {
    eventTypes: CatalogOption[];
    levels: CatalogOption[];
  };
};

type Filters = {
  q: string;
  date: string;
  eventTypeId: number;
  levelId: number;
  distanceKm: number;
  userLat: number | null;
  userLng: number | null;
};

const LIMA_DEFAULT = { lat: -12.0464, lng: -77.0428 };
type TimeFilter = 'upcoming' | 'past';

export default function EventExplorerClient({ initialEvents, initialCatalogs }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventEntity[]>(initialEvents);
  const [catalogs, setCatalogs] = useState(initialCatalogs);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    q: '',
    date: '',
    eventTypeId: 0,
    levelId: 0,
    distanceKm: 0,
    userLat: null,
    userLng: null,
  });

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.q ||
        filters.date ||
        filters.eventTypeId ||
        filters.levelId ||
        filters.distanceKm ||
        (filters.userLat && filters.userLng)
    );
  }, [filters]);

  const eventTypeOptions = useMemo<OptionSelect[]>(
    () =>
      catalogs.eventTypes.map((option) => ({
        value: option.id,
        label: option.name,
      })),
    [catalogs.eventTypes]
  );

  const levelOptions = useMemo<OptionSelect[]>(
    () =>
      catalogs.levels.map((option) => ({
        value: option.id,
        label: option.name,
      })),
    [catalogs.levels]
  );

  const upcomingEvents = useMemo(
    () => events.filter((event) => !hasEventStarted(event.startTime)),
    [events]
  );

  const pastEvents = useMemo(() => events.filter((event) => hasEventStarted(event.startTime)), [events]);

  const visibleEvents = timeFilter === 'upcoming' ? upcomingEvents : pastEvents;

  const visibleEventIds = useMemo(() => new Set(visibleEvents.map((event) => event.id)), [visibleEvents]);
  const createIntentRequested = searchParams.get('create') === '1';
  const userIsAdmin = Boolean(user && isAdminUser(user as any));
  const createEventHref = userIsAdmin ? '/admin/events/new' : '/create-event';

  useEffect(() => {
    setSelectedEventId((current) => (current && visibleEventIds.has(current) ? current : null));
    setHoveredEventId((current) => (current && visibleEventIds.has(current) ? current : null));
  }, [visibleEventIds]);

  useEffect(() => {
    if (!createIntentRequested) return;
    router.replace(createEventHref);
  }, [createEventHref, createIntentRequested, router]);

  async function refreshEvents(preferredId?: string, currentFilters?: Filters) {
    const activeFilters = currentFilters ?? filters;
    const params = new URLSearchParams();

    if (activeFilters.q) params.set('q', activeFilters.q);
    if (activeFilters.date) params.set('date', activeFilters.date);
    if (activeFilters.eventTypeId) params.set('eventTypeId', String(activeFilters.eventTypeId));
    if (activeFilters.levelId) params.set('levelId', String(activeFilters.levelId));
    if (activeFilters.distanceKm) params.set('distanceKm', String(activeFilters.distanceKm));
    if (activeFilters.userLat != null && activeFilters.userLng != null) {
      params.set('userLat', String(activeFilters.userLat));
      params.set('userLng', String(activeFilters.userLng));
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/events?${params.toString()}`, { cache: 'no-store' });
      const body = await response.json();
      const data = body.data ?? [];

      setEvents(data);
      if (body.catalogs) setCatalogs(body.catalogs);

      if (preferredId) {
        setSelectedEventId(preferredId);
        return;
      }

      setSelectedEventId((current) => {
        if (!current) return null;
        return data.some((event: EventEntity) => event.id === current) ? current : null;
      });
      setHoveredEventId((current) => {
        if (!current) return null;
        return data.some((event: EventEntity) => event.id === current) ? current : null;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      refreshEvents(undefined, filters);
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    filters.q,
    filters.date,
    filters.eventTypeId,
    filters.levelId,
    filters.distanceKm,
    filters.userLat,
    filters.userLng,
  ]);

  async function useMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFilters((prev) => ({
          ...prev,
          userLat: Number(position.coords.latitude.toFixed(6)),
          userLng: Number(position.coords.longitude.toFixed(6)),
          distanceKm: prev.distanceKm || 10,
        }));
      },
      (error) => {
        setGeoError(error.message || 'No se pudo obtener tu ubicación.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  function clearFilters() {
    setFilters({
      q: '',
      date: '',
      eventTypeId: 0,
      levelId: 0,
      distanceKm: 0,
      userLat: null,
      userLng: null,
    });
    setGeoError(null);
  }

  function openCreateEventFlow() {
    trackEvent('create_event_clicked', {
      source: 'events_explorer_header',
      channel: 'web',
      auth_state: user ? 'authenticated' : 'anonymous',
      is_admin: userIsAdmin,
    });

    if (authLoading) return;
    router.push(createEventHref);
  }

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 py-8 md:py-12">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-eastman-extrabold text-slate-900">Eventos en mapa</h1>
          <p className="mt-1 text-sm text-slate-600">
            Explora partidos, revisa detalle sin salir del mapa y crea eventos con ubicación exacta.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateEventFlow}
          disabled={authLoading}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#54086F] px-4 text-sm font-semibold text-white"
        >
          Crear evento
        </button>
      </div>

      <div className="mb-4">
        <div
          className="inline-flex rounded-2xl bg-slate-100 p-1"
          role="tablist"
          aria-label="Filtrar eventos por estado"
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

      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <Input
          value={filters.q}
          onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
          className="h-11 md:col-span-2"
          placeholder="Buscar por título o dirección"
        />

        <Input
          type="date"
          value={filters.date}
          onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
          className="h-11"
        />

        <SelectComponent
          options={eventTypeOptions}
          value={filters.eventTypeId}
          onChange={(value) => setFilters((prev) => ({ ...prev, eventTypeId: Number(value) || 0 }))}
          isSearchable={false}
          className="text-sm"
          selectProps={{
            instanceId: 'event-map-type-filter',
            inputId: 'event-map-type-filter',
            placeholder: 'Tipo de evento',
          }}
        />

        <SelectComponent
          options={levelOptions}
          value={filters.levelId}
          onChange={(value) => setFilters((prev) => ({ ...prev, levelId: Number(value) || 0 }))}
          isSearchable={false}
          className="text-sm"
          selectProps={{
            instanceId: 'event-map-level-filter',
            inputId: 'event-map-level-filter',
            placeholder: 'Nivel',
          }}
        />

        <Input
          type="number"
          min={0}
          placeholder="Distancia (km)"
          value={filters.distanceKm || ''}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, distanceKm: Number(event.target.value) || 0 }))
          }
          className="h-11"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-700">
          {visibleEvents.length} {timeFilter === 'upcoming' ? 'próximos' : 'pasados'} encontrados
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
        >
          Usar mi ubicación
        </button>
        <button
          type="button"
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              userLat: LIMA_DEFAULT.lat,
              userLng: LIMA_DEFAULT.lng,
              distanceKm: prev.distanceKm || 10,
            }))
          }
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
        >
          Centro Lima
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            Limpiar filtros
          </button>
        )}
        {loading && <p className="text-sm text-slate-500">Actualizando resultados...</p>}
        {geoError && <p className="text-sm text-red-600">{geoError}</p>}
      </div>

      <div className="mb-4 xl:hidden">
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Cambiar vista">
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === 'list'}
            onClick={() => setMobileView('list')}
            className={[
              'flex items-center gap-2 h-10 rounded-lg px-4 text-sm font-semibold transition-all duration-200',
              mobileView === 'list'
                ? 'bg-mulberry text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
            Lista
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === 'map'}
            onClick={() => setMobileView('map')}
            className={[
              'flex items-center gap-2 h-10 rounded-lg px-4 text-sm font-semibold transition-all duration-200',
              mobileView === 'map'
                ? 'bg-mulberry text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 00-1.147 0l-4.084 1.69A1.5 1.5 0 002 5.25v10.877a1.5 1.5 0 002.074 1.386l3.51-1.452 4.26 1.762a1.5 1.5 0 001.146 0l4.083-1.69A1.5 1.5 0 0018 14.75V3.872a1.5 1.5 0 00-2.073-1.386l-3.51 1.452-4.26-1.762zM7.58 5a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0v-6.5A.75.75 0 017.58 5zm5.59 2.75a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5z" clipRule="evenodd" />
            </svg>
            Mapa
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={['order-2 xl:order-1', mobileView === 'map' ? 'hidden xl:block' : 'block'].join(' ')}>
          <EventListPanel
            events={visibleEvents}
            selectedEventId={selectedEventId}
            hoveredEventId={hoveredEventId}
            onHoverEvent={setHoveredEventId}
            isLoading={loading}
            emptyMessage={
              timeFilter === 'upcoming'
                ? 'No hay eventos próximos con estos filtros.'
                : 'No hay eventos finalizados con estos filtros.'
            }
          />
        </div>

        <div
          className={[
            'order-1 xl:order-2 xl:sticky xl:top-24',
            mobileView === 'list' ? 'hidden xl:block' : 'block',
          ].join(' ')}
        >
          <EventsMap
            events={visibleEvents}
            selectedEventId={selectedEventId}
            hoveredEventId={hoveredEventId}
            onSelectEvent={(id) => setSelectedEventId(id)}
            className="xl:h-[calc(100vh-140px)]"
          />
        </div>
      </div>
      </section>
  );
}
