'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MapboxMap, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';
import { hasEventStarted } from '@modules/events/lib/eventTiming';

type EventLite = {
  id: string | number;
  title?: string;
  formattedDateTime?: string;
  dateLabel?: string;
  startTime?: string | null;
  locationText?: string;
  price?: number;
  location?: {
    lat?: number;
    lng?: number;
    long?: number;
  };
  lat?: number;
  lng?: number;
  long?: number;
};

type Props = {
  events: EventLite[];
};

function extractCoords(event: EventLite) {
  const lat = Number(event.location?.lat ?? event.lat ?? 0);
  const lng = Number(event.location?.lng ?? event.location?.long ?? event.lng ?? event.long ?? 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export default function LandingEventsMap({ events }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const points = useMemo(
    () =>
      events
        .map((event) => {
          const coords = extractCoords(event);
          if (!coords) return null;
          return {
            id: String(event.id),
            title: event.title || 'Evento',
            date: event.formattedDateTime || event.dateLabel || 'Fecha por confirmar',
            isPastEvent: hasEventStarted(event.startTime),
            locationText: event.locationText || 'Ubicación por confirmar',
            price: Number(event.price ?? 0),
            ...coords,
          };
        })
        .filter(Boolean) as Array<{
          id: string;
          title: string;
          date: string;
          isPastEvent: boolean;
          locationText: string;
          price: number;
          lat: number;
          lng: number;
        }>,
    [events]
  );

  const center = points[0] ?? { lat: -12.0464, lng: -77.0428 };
  const activeId = pinnedId ?? hoveredId;
  const activePoint = points.find((point) => point.id === activeId) ?? null;

  if (!token) {
    return (
      <div className="h-[360px] rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Configura <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> para mostrar el mapa en landing.
      </div>
    );
  }

  return (
    <div className="h-[360px] md:h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <MapboxMap
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={token}
        initialViewState={{ latitude: center.lat, longitude: center.lng, zoom: 11.5 }}
        style={{ width: '100%', height: '100%' }}
        onClick={() => {
          setPinnedId(null);
          setHoveredId(null);
        }}
      >
        <NavigationControl position="top-right" />
        {points.map((point) => (
          <Marker key={point.id} latitude={point.lat} longitude={point.lng} anchor="bottom">
            <button
              type="button"
              title={point.title}
              onClick={(event) => {
                event.stopPropagation();
                setPinnedId((current) => (current === point.id ? null : point.id));
              }}
              onMouseEnter={() => setHoveredId(point.id)}
              onMouseLeave={() => setHoveredId((current) => (current === point.id ? null : current))}
              className={[
                'h-4 w-4 rounded-full border-2 border-white shadow transition',
                activeId === point.id ? 'bg-[#F0815B] scale-125' : 'bg-[#54086F]',
              ].join(' ')}
              aria-label={`Ver evento ${point.title}`}
            />
          </Marker>
        ))}
        {activePoint && (
          <Popup
            latitude={activePoint.lat}
            longitude={activePoint.lng}
            anchor="top"
            offset={16}
            onClose={() => {
              setPinnedId(null);
              setHoveredId(null);
            }}
            closeOnClick={false}
            closeButton={false}
            className="landing-map-popup"
          >
            <div className="w-[min(80vw,210px)]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold uppercase leading-tight text-slate-900">{activePoint.title}</p>
                <span className="rounded-full bg-[#54086F]/10 px-2 py-1 text-[11px] font-semibold text-[#54086F]">
                  S/ {Number(activePoint.price || 0).toFixed(0)}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-[#54086F]">{activePoint.date}</p>
              {activePoint.isPastEvent && (
                <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                  Finalizado
                </p>
              )}
              <p className="mt-1 text-[11px] leading-4 text-slate-600 line-clamp-2">{activePoint.locationText}</p>
              <div className="mt-3 flex">
                <button
                  type="button"
                  onClick={() => router.push(`/events/${activePoint.id}`)}
                  className="inline-flex h-8 items-center rounded-md bg-[#54086F] px-3 text-xs font-semibold text-white hover:bg-[#3f0554]"
                >
                  Ver detalle
                </button>
              </div>
            </div>
          </Popup>
        )}
      </MapboxMap>
    </div>
  );
}
