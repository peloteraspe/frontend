'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, InfoWindowF, MarkerClustererF, MarkerF } from '@react-google-maps/api';
import type { ClusterIconStyle } from '@react-google-maps/marker-clusterer';
import { EventEntity } from '@modules/events/model/types';
import { useGoogleMapsApi } from '@core/ui/Map/useGoogleMapsApi';
import {
  buildCircleMarkerIcon,
  LIMA_DEFAULT_CENTER,
  toLatLngLiteral,
} from '@shared/lib/googleMaps';

type Props = {
  events: EventEntity[];
  selectedEventId: string | null;
  hoveredEventId: string | null;
  onSelectEvent: (id: string | null) => void;
  className?: string;
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

const CLUSTERER_OPTIONS = {
  averageCenter: true,
  gridSize: 48,
  minimumClusterSize: 2,
};

const CLUSTER_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 54 54" fill="none">
    <circle cx="27" cy="27" r="26" fill="#54086F" fill-opacity="0.16" />
    <circle cx="27" cy="27" r="21" fill="#54086F" fill-opacity="0.28" />
    <circle cx="27" cy="27" r="16" fill="#54086F" />
  </svg>
`.trim();

const CLUSTER_STYLES: ClusterIconStyle[] = [
  {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CLUSTER_ICON_SVG)}`,
    height: 54,
    width: 54,
    textColor: '#FFFFFF',
    textSize: 16,
    fontWeight: '700',
  },
];

function hasValidLocation(event: EventEntity) {
  return Number.isFinite(event.location.lat) && Number.isFinite(event.location.lng);
}

export default function EventsMap({
  events,
  selectedEventId,
  hoveredEventId,
  onSelectEvent,
  className,
}: Props) {
  const apiKeyConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
  const { isLoaded, loadError } = useGoogleMapsApi();
  const mapRef = useRef<google.maps.Map | null>(null);
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [displayedActiveId, setDisplayedActiveId] = useState<string | null>(null);

  const activeId = pinnedId ?? selectedEventId;
  const mappableEvents = useMemo(() => events.filter(hasValidLocation), [events]);

  useEffect(() => {
    if (activeId) {
      setDisplayedActiveId(activeId);
      return;
    }
    const timeout = setTimeout(() => setDisplayedActiveId(null), 120);
    return () => clearTimeout(timeout);
  }, [activeId]);

  const activeEvent = events.find((event) => event.id === displayedActiveId) ?? null;

  function closeActiveCard() {
    setPinnedId(null);
    setHoveredId(null);
    onSelectEvent(null);
  }

  useEffect(() => {
    if (!mapRef.current) return;

    if (!selectedEventId) {
      if (mappableEvents.length === 0) return;

      if (mappableEvents.length === 1) {
        mapRef.current.panTo(toLatLngLiteral(mappableEvents[0].location.lat, mappableEvents[0].location.lng));
        mapRef.current.setZoom(11);
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      mappableEvents.forEach((event) => {
        bounds.extend(toLatLngLiteral(event.location.lat, event.location.lng));
      });
      mapRef.current.fitBounds(bounds);
      return;
    }

    const selected = events.find((event) => event.id === selectedEventId);
    if (!selected) return;

    mapRef.current.panTo(toLatLngLiteral(selected.location.lat, selected.location.lng));
    mapRef.current.setZoom(13);
  }, [events, mappableEvents, selectedEventId]);

  const initialCenter = mappableEvents[0]?.location ?? LIMA_DEFAULT_CENTER;

  if (!apiKeyConfigured) {
    return (
      <div
        className={[
          'h-[60vh] rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700',
          className || '',
        ].join(' ')}
      >
        Falta configurar <code>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> en entorno.
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={[
          'h-[60vh] rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700',
          className || '',
        ].join(' ')}
      >
        No se pudo cargar Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={[
          'h-[60vh] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 md:h-[76vh]',
          className || '',
        ].join(' ')}
      />
    );
  }

  return (
    <div
      className={[
        'h-[60vh] md:h-[76vh] rounded-2xl overflow-hidden border border-slate-200 shadow-sm',
        className || '',
      ].join(' ')}
    >
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={toLatLngLiteral(initialCenter.lat, initialCenter.lng)}
        zoom={11}
        options={MAP_OPTIONS}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        onClick={closeActiveCard}
      >
        <MarkerClustererF options={CLUSTERER_OPTIONS} styles={CLUSTER_STYLES}>
          {(clusterer) => (
            <>
              {mappableEvents.map((event) => {
                const isActive = displayedActiveId === event.id;
                const isHovered = hoveredId === event.id || hoveredEventId === event.id;

                return (
                  <MarkerF
                    key={event.id}
                    clusterer={clusterer}
                    position={toLatLngLiteral(event.location.lat, event.location.lng)}
                    title={event.title}
                    icon={buildCircleMarkerIcon(
                      isActive ? '#F0815B' : '#54086F',
                      isActive ? 8 : isHovered ? 7 : 6
                    )}
                    onClick={() => {
                      const shouldClose = pinnedId === event.id;
                      if (shouldClose) {
                        closeActiveCard();
                        return;
                      }
                      onSelectEvent(event.id);
                      setPinnedId(event.id);
                    }}
                    onMouseOver={() => setHoveredId(event.id)}
                    onMouseOut={() => setHoveredId((current) => (current === event.id ? null : current))}
                  />
                );
              })}
            </>
          )}
        </MarkerClustererF>

        {activeEvent ? (
          <InfoWindowF
            position={toLatLngLiteral(activeEvent.location.lat, activeEvent.location.lng)}
            options={{ pixelOffset: new google.maps.Size(0, -20) }}
            onCloseClick={closeActiveCard}
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
          </InfoWindowF>
        ) : null}
      </GoogleMap>
    </div>
  );
}
