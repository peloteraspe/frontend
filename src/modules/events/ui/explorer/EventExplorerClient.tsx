'use client';

import { useEffect, useMemo, useState } from 'react';
import { CatalogOption, EventEntity } from '@modules/events/model/types';
import MapboxEventsMap from './MapboxEventsMap';
import EventListPanel from './EventListPanel';
import CreateEventModal from './CreateEventModal';

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

export default function EventExplorerClient({ initialEvents, initialCatalogs }: Props) {
  const [events, setEvents] = useState<EventEntity[]>(initialEvents);
  const [catalogs, setCatalogs] = useState(initialCatalogs);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [isCreating, setIsCreating] = useState(false);
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
          onClick={() => setIsCreating(true)}
          className="h-11 rounded-xl bg-[#54086F] px-4 text-sm font-semibold text-white"
        >
          Crear evento
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <input
          value={filters.q}
          onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
          className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm md:col-span-2"
          placeholder="Buscar por título o dirección"
        />

        <input
          type="date"
          value={filters.date}
          onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
        />

        <select
          value={filters.eventTypeId}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, eventTypeId: Number(event.target.value) }))
          }
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
        >
          <option value={0}>Tipo de evento</option>
          {catalogs.eventTypes.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <select
          value={filters.levelId}
          onChange={(event) => setFilters((prev) => ({ ...prev, levelId: Number(event.target.value) }))}
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
        >
          <option value={0}>Nivel</option>
          {catalogs.levels.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={0}
          placeholder="Distancia (km)"
          value={filters.distanceKm || ''}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, distanceKm: Number(event.target.value) || 0 }))
          }
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-700">{events.length} partidos encontrados</p>
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
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
          >
            Limpiar filtros
          </button>
        )}
        {loading && <p className="text-sm text-slate-500">Actualizando resultados...</p>}
        {geoError && <p className="text-sm text-red-600">{geoError}</p>}
      </div>

      <div className="mb-4 flex items-center gap-2 xl:hidden">
        <button
          type="button"
          onClick={() => setMobileView('list')}
          className={[
            'h-10 rounded-lg px-3 text-sm font-semibold',
            mobileView === 'list'
              ? 'bg-[#54086F] text-white'
              : 'border border-slate-300 bg-white text-slate-700',
          ].join(' ')}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => setMobileView('map')}
          className={[
            'h-10 rounded-lg px-3 text-sm font-semibold',
            mobileView === 'map'
              ? 'bg-[#54086F] text-white'
              : 'border border-slate-300 bg-white text-slate-700',
          ].join(' ')}
        >
          Mapa
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(740px,820px)_minmax(520px,1fr)]">
        <div className={['order-2 xl:order-1', mobileView === 'map' ? 'hidden xl:block' : 'block'].join(' ')}>
          <EventListPanel
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={(id) => setSelectedEventId(id)}
            hoveredEventId={hoveredEventId}
            onHoverEvent={setHoveredEventId}
            isLoading={loading}
          />
        </div>

        <div
          className={[
            'order-1 xl:order-2 xl:sticky xl:top-24',
            mobileView === 'list' ? 'hidden xl:block' : 'block',
          ].join(' ')}
        >
          <MapboxEventsMap
            events={events}
            selectedEventId={selectedEventId}
            hoveredEventId={hoveredEventId}
            onSelectEvent={(id) => setSelectedEventId(id)}
            className="xl:h-[calc(100vh-140px)]"
          />
        </div>
      </div>

      <CreateEventModal
        isOpen={isCreating}
        eventTypes={catalogs.eventTypes}
        levels={catalogs.levels}
        onClose={() => setIsCreating(false)}
        onCreated={(id) => {
          refreshEvents(id);
        }}
      />
    </section>
  );
}
