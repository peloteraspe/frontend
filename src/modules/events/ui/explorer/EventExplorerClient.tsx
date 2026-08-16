'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@core/auth/AuthProvider';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Input from '@core/ui/Input';
import SelectComponent, { OptionSelect } from '@core/ui/SelectComponent';
import { hasEventEnded } from '@modules/events/lib/eventTiming';
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  const activeFilterCount = [
    filters.q,
    filters.date,
    filters.eventTypeId,
    filters.levelId,
    filters.distanceKm,
    filters.userLat != null && filters.userLng != null,
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

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
    () => events.filter((event) => !hasEventEnded(event.endTime, undefined, event.startTime)),
    [events]
  );

  const pastEvents = useMemo(
    () => events.filter((event) => hasEventEnded(event.endTime, undefined, event.startTime)),
    [events]
  );

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
    <section className="site-shell site-section-compact">
      <div className="px-0 py-2 sm:py-4">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-eastman-extrabold text-slate-900 sm:text-4xl">
              Encuentra dónde jugar
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Busca una pichanga por fecha, zona o nivel y revisa todo antes de sumarte.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateEventFlow}
            disabled={authLoading}
            className="home-button-micro premium-outline inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-mulberry hover:border-mulberry"
          >
            Crear evento
          </button>
        </div>

        <div className="mb-4">
          <div className="premium-tab-group" role="tablist" aria-label="Filtrar eventos por estado">
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

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Filtrar eventos</p>
              <p className="mt-0.5 text-xs text-slate-500">Encuentra una fecha por nombre, tipo, nivel o zona.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                aria-expanded={showAdvancedFilters}
                aria-controls="event-advanced-filters"
                className="home-button-micro inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-3.5 text-sm font-semibold text-slate-700 hover:border-mulberry/40"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden="true" />
                Más filtros
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-mulberry px-2 py-0.5 text-xs text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="home-button-micro inline-flex h-10 w-fit items-center gap-2 rounded-xl px-3 text-sm font-semibold text-mulberry hover:bg-mulberry/5"
                >
                  <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.35fr)]">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Buscar</p>
              <Input
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                className="h-11"
                placeholder="Título, cancha o dirección"
                aria-label="Buscar eventos"
                icon={<MagnifyingGlassIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />}
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Fecha</p>
              <Input
                type="date"
                value={filters.date}
                onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
                className="h-11"
                aria-label="Filtrar por fecha"
              />
            </div>

          </div>

          {showAdvancedFilters ? (
            <div id="event-advanced-filters" className="mt-5 border-t border-slate-200 pt-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-600">Tipo de evento</p>
                  <SelectComponent
                    options={eventTypeOptions}
                    value={filters.eventTypeId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, eventTypeId: Number(value) || 0 }))}
                    isSearchable={false}
                    className="text-sm"
                    selectProps={{
                      instanceId: 'event-map-type-filter',
                      inputId: 'event-map-type-filter',
                      placeholder: 'Todos',
                      'aria-label': 'Filtrar por tipo de evento',
                    }}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-600">Nivel</p>
                  <SelectComponent
                    options={levelOptions}
                    value={filters.levelId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, levelId: Number(value) || 0 }))}
                    isSearchable={false}
                    className="text-sm"
                    selectProps={{
                      instanceId: 'event-map-level-filter',
                      inputId: 'event-map-level-filter',
                      placeholder: 'Todos',
                      'aria-label': 'Filtrar por nivel',
                    }}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-600">Distancia máxima</p>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ej. 10 km"
                    value={filters.distanceKm || ''}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, distanceKm: Number(event.target.value) || 0 }))
                    }
                    className="h-11"
                    aria-label="Distancia máxima en kilómetros"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-mulberry" aria-hidden="true" />
                  <span>Define un punto de referencia para aplicar la distancia.</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                  <button
                    type="button"
                    onClick={useMyLocation}
                    className="home-button-micro premium-outline inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-medium text-slate-700"
                  >
                    Mi ubicación
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
                    className="home-button-micro premium-outline inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-medium text-slate-700"
                  >
                    Centro de Lima
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-700">
            {visibleEvents.length} {timeFilter === 'upcoming' ? 'próximos' : 'pasados'} encontrados
          </p>
          {loading && <p className="text-sm text-slate-500">Actualizando resultados...</p>}
          {geoError && <p className="text-sm text-red-600">{geoError}</p>}
        </div>

        {visibleEvents.length > 0 ? (
          <div className="mb-4 xl:hidden">
          <div className="premium-tab-group" role="tablist" aria-label="Cambiar vista">
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === 'list'}
              onClick={() => setMobileView('list')}
              data-active={mobileView === 'list'}
              className="premium-tab-button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
              Lista
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === 'map'}
              onClick={() => setMobileView('map')}
              data-active={mobileView === 'map'}
              className="premium-tab-button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 00-1.147 0l-4.084 1.69A1.5 1.5 0 002 5.25v10.877a1.5 1.5 0 002.074 1.386l3.51-1.452 4.26 1.762a1.5 1.5 0 001.146 0l4.083-1.69A1.5 1.5 0 0018 14.75V3.872a1.5 1.5 0 00-2.073-1.386l-3.51 1.452-4.26-1.762zM7.58 5a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0v-6.5A.75.75 0 017.58 5zm5.59 2.75a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5z" clipRule="evenodd" />
              </svg>
              Mapa
            </button>
          </div>
          </div>
        ) : null}

        <div
          className={
            visibleEvents.length > 0
              ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
              : ''
          }
        >
          <div className={['order-2 xl:order-1', mobileView === 'map' ? 'hidden xl:block' : 'block'].join(' ')}>
            <EventListPanel
              events={visibleEvents}
              selectedEventId={selectedEventId}
              hoveredEventId={hoveredEventId}
              onHoverEvent={setHoveredEventId}
              isLoading={loading}
              emptyMessage={
                timeFilter === 'upcoming'
                  ? 'No encontramos próximas pichangas con estos filtros.'
                  : 'No hay eventos finalizados con estos filtros.'
              }
              emptyAction={
                <>
                  {timeFilter === 'upcoming' && pastEvents.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setTimeFilter('past')}
                      className="home-button-micro inline-flex h-11 items-center rounded-xl bg-mulberry px-4 text-sm font-semibold text-white"
                    >
                      Ver eventos pasados
                    </button>
                  ) : null}
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="home-button-micro premium-outline inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-700"
                    >
                      Limpiar filtros
                    </button>
                  ) : null}
                </>
              }
            />
          </div>

          {visibleEvents.length > 0 ? (
            <div
              className={[
                'order-1 xl:order-2 xl:sticky xl:top-20',
                mobileView === 'list' ? 'hidden xl:block' : 'block',
              ].join(' ')}
            >
              <EventsMap
                events={visibleEvents}
                selectedEventId={selectedEventId}
                hoveredEventId={hoveredEventId}
                onSelectEvent={(id) => setSelectedEventId(id)}
                className="xl:h-[calc(100vh-110px)]"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
