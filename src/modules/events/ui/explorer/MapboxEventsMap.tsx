'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Map, { Layer, MapRef, Marker, NavigationControl, Popup, Source } from 'react-map-gl/mapbox';
import { EventEntity } from '@modules/events/model/types';

type Props = {
  events: EventEntity[];
  selectedEventId: string | null;
  hoveredEventId: string | null;
  onSelectEvent: (id: string) => void;
  className?: string;
};

const CLUSTER_LAYER: any = {
  id: 'clusters',
  type: 'circle',
  source: 'events',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#54086F',
    'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 30],
  },
};

const CLUSTER_COUNT_LAYER: any = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'events',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 12,
  },
  paint: {
    'text-color': '#FFFFFF',
  },
};

export default function MapboxEventsMap({
  events,
  selectedEventId,
  hoveredEventId,
  onSelectEvent,
  className,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [displayedActiveId, setDisplayedActiveId] = useState<string | null>(null);

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: events
        .filter((event) => event.location.lat && event.location.lng)
        .map((event) => ({
          type: 'Feature' as const,
          properties: { id: event.id },
          geometry: {
            type: 'Point' as const,
            coordinates: [event.location.lng, event.location.lat],
          },
        })),
    }),
    [events]
  );

  const activeId = pinnedId ?? selectedEventId;

  useEffect(() => {
    if (activeId) {
      setDisplayedActiveId(activeId);
      return;
    }
    const timeout = setTimeout(() => setDisplayedActiveId(null), 120);
    return () => clearTimeout(timeout);
  }, [activeId]);

  const activeEvent = events.find((event) => event.id === displayedActiveId) ?? null;

  useEffect(() => {
    if (!selectedEventId) return;
    const selected = events.find((event) => event.id === selectedEventId);
    if (!selected) return;

    mapRef.current?.easeTo({
      center: [selected.location.lng, selected.location.lat],
      duration: 450,
      zoom: 13,
    });
  }, [events, selectedEventId]);

  const initialCenter = events[0]?.location ?? { lat: -12.0464, lng: -77.0428 };

  if (!token) {
    return (
      <div
        className={[
          'h-[60vh] rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700',
          className || '',
        ].join(' ')}
      >
        Falta configurar <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> en entorno.
      </div>
    );
  }

  return (
    <div
      className={[
        'h-[60vh] md:h-[76vh] rounded-2xl overflow-hidden border border-slate-200 shadow-sm',
        className || '',
      ].join(' ')}
    >
      <Map
        ref={mapRef}
        initialViewState={{ latitude: initialCenter.lat, longitude: initialCenter.lng, zoom: 11 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
        onClick={(eventInfo) => {
          const feature = eventInfo.features?.[0];
          if (!feature) {
            setPinnedId(null);
            setHoveredId(null);
            return;
          }

          if (feature.properties?.cluster_id) {
            const source = mapRef.current?.getSource('events') as any;
            source?.getClusterExpansionZoom(feature.properties.cluster_id, (err: any, zoom: number) => {
              if (err) return;
              const coordinates = (feature.geometry as any)?.coordinates as [number, number];
              mapRef.current?.easeTo({
                center: coordinates,
                zoom,
                duration: 500,
              });
            });
            return;
          }

          const eventId = feature.properties?.id;
          if (eventId) {
            const id = String(eventId);
            onSelectEvent(id);
            setPinnedId(id);
          }
        }}
        interactiveLayerIds={['clusters']}
      >
        <NavigationControl position="top-right" />

        <Source
          id="events"
          type="geojson"
          data={geojson}
          cluster
          clusterMaxZoom={13}
          clusterRadius={48}
        >
          <Layer {...CLUSTER_LAYER} />
          <Layer {...CLUSTER_COUNT_LAYER} />
        </Source>

        {events.map((event) => (
          <Marker key={event.id} latitude={event.location.lat} longitude={event.location.lng} anchor="bottom">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(event.id);
                setPinnedId((current) => (current === event.id ? null : event.id));
              }}
              onMouseEnter={() => setHoveredId(event.id)}
              onMouseLeave={() => setHoveredId((current) => (current === event.id ? null : current))}
              className={[
                'h-4 w-4 rounded-full border-2 border-white shadow transition',
                displayedActiveId === event.id
                  ? 'bg-[#F0815B] scale-125'
                  : hoveredId === event.id || hoveredEventId === event.id
                    ? 'bg-[#54086F] scale-110'
                    : 'bg-[#54086F]',
              ].join(' ')}
              aria-label={`Ver evento ${event.title}`}
            />
          </Marker>
        ))}

        {activeEvent && (
          <Popup
            latitude={activeEvent.location.lat}
            longitude={activeEvent.location.lng}
            anchor="top"
            offset={16}
            closeOnClick={false}
            closeButton={false}
            className="landing-map-popup"
          >
            <div className="w-[min(80vw,210px)]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold uppercase leading-tight text-slate-900">{activeEvent.title}</p>
                <span className="rounded-full bg-[#54086F]/10 px-2 py-1 text-[11px] font-semibold text-[#54086F]">
                  S/ {Number(activeEvent.price || 0).toFixed(0)}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-[#54086F]">{activeEvent.dateLabel}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-600 line-clamp-2">{activeEvent.locationText}</p>
              <div className="mt-3 flex">
                <button
                  type="button"
                  onClick={() => router.push(`/events/${activeEvent.id}`)}
                  className="inline-flex h-8 items-center rounded-md bg-[#54086F] px-3 text-xs font-semibold text-white hover:bg-[#3f0554]"
                >
                  Ver detalle
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
