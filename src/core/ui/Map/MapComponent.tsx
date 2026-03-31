'use client';

import React from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { buildCircleMarkerIcon, toLatLngLiteral } from '@shared/lib/googleMaps';
import { useGoogleMapsApi } from './useGoogleMapsApi';
import { MapProps } from './Map.types';

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

const MapComponent: React.FC<MapProps> = ({ lat, lng }) => {
  const apiKeyConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
  const { isLoaded, loadError } = useGoogleMapsApi();
  const center = toLatLngLiteral(lat, lng);

  if (!apiKeyConfigured) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm text-red-700">
        Falta configurar <code>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code>.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm text-red-700">
        No se pudo cargar Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="h-[400px] animate-pulse rounded-xl border border-slate-200 bg-slate-100" />;
  }

  return (
    <div className="h-[400px] overflow-hidden rounded-xl border border-slate-200">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={13}
        options={MAP_OPTIONS}
      >
        <MarkerF position={center} icon={buildCircleMarkerIcon('#54086F', 8)} />
      </GoogleMap>
    </div>
  );
};

export default MapComponent;
