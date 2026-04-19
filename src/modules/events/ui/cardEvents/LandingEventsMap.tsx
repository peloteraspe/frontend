'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, InfoWindowF, MarkerF } from '@react-google-maps/api';
import { hasEventEnded } from '@modules/events/lib/eventTiming';
import { buildCircleMarkerIcon, LIMA_DEFAULT_CENTER, toLatLngLiteral } from '@shared/lib/googleMaps';
import { useGoogleMapsApi } from '@core/ui/Map/useGoogleMapsApi';

type EventLite = {
  id: string | number;
  title?: string;
  formattedDateTime?: string;
  dateLabel?: string;
  startTime?: string | null;
  endTime?: string | null;
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

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

const MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  zoomControl: true,
};

function extractCoords(event: EventLite) {
  const lat = Number(event.location?.lat ?? event.lat ?? 0);
  const lng = Number(event.location?.lng ?? event.location?.long ?? event.lng ?? event.long ?? 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export default function LandingEventsMap({ events }: Props) {
  const apiKeyConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
  const { isLoaded, loadError } = useGoogleMapsApi();
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
            isPastEvent: hasEventEnded(event.endTime, undefined, event.startTime),
            locationText: event.locationText || 'Ubicacion por confirmar',
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

  const center = points[0] ?? LIMA_DEFAULT_CENTER;
  const activeId = pinnedId ?? hoveredId;
  const activePoint = points.find((point) => point.id === activeId) ?? null;

  if (!apiKeyConfigured) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-[1.5rem] border border-red-200 bg-red-50 px-4 text-sm text-red-700">
        Configura <code>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> para mostrar el mapa en landing.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-[1.5rem] border border-red-200 bg-red-50 px-4 text-sm text-red-700">
        No se pudo cargar Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="premium-card h-[360px] animate-pulse md:h-[520px]" />;
  }

  return (
    <div className="premium-card h-[360px] overflow-hidden md:h-[520px]">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={toLatLngLiteral(center.lat, center.lng)}
        zoom={11.5}
        options={MAP_OPTIONS}
        onClick={() => {
          setPinnedId(null);
          setHoveredId(null);
        }}
      >
        {points.map((point) => {
          const isActive = activeId === point.id;

          return (
            <MarkerF
              key={point.id}
              position={toLatLngLiteral(point.lat, point.lng)}
              title={point.title}
              icon={buildCircleMarkerIcon(isActive ? '#F0815B' : '#54086F', isActive ? 8 : 6)}
              onClick={() => {
                setPinnedId((current) => (current === point.id ? null : point.id));
              }}
              onMouseOver={() => setHoveredId(point.id)}
              onMouseOut={() => setHoveredId((current) => (current === point.id ? null : current))}
            />
          );
        })}

        {activePoint ? (
          <InfoWindowF
            position={toLatLngLiteral(activePoint.lat, activePoint.lng)}
            options={{ pixelOffset: new google.maps.Size(0, -20) }}
            onCloseClick={() => {
              setPinnedId(null);
              setHoveredId(null);
            }}
          >
            <div className="w-[min(80vw,210px)]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold uppercase leading-tight text-slate-900">{activePoint.title}</p>
                <span className="rounded-full bg-[#54086F]/10 px-2 py-1 text-[11px] font-semibold text-[#54086F]">
                  S/ {Number(activePoint.price || 0).toFixed(0)}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-[#54086F]">{activePoint.date}</p>
              {activePoint.isPastEvent ? (
                <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                  Finalizado
                </p>
              ) : null}
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-600">{activePoint.locationText}</p>
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
          </InfoWindowF>
        ) : null}
      </GoogleMap>
    </div>
  );
}
