'use client';
import { GoogleMap, Marker as GoogleMarker, useLoadScript } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import MapboxMap, { Marker as MapboxMarker, NavigationControl } from 'react-map-gl/mapbox';
import React from 'react';
import { MapProps } from './Map.types';

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

const MapComponent: React.FC<MapProps> = ({ lat, lng }) => {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  if (mapboxToken) {
    return (
      <div className="h-[400px] overflow-hidden rounded-xl border border-slate-200">
        <MapboxMap
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={mapboxToken}
          initialViewState={{ latitude: lat, longitude: lng, zoom: 13 }}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />
          <MapboxMarker latitude={lat} longitude={lng} anchor="bottom" />
        </MapboxMap>
      </div>
    );
  }

  return (
    <div>
      {isLoaded && (
        <div>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '400px' }}
            center={{ lat, lng }}
            zoom={10}
          >
            {/* add marker here */}
            <GoogleMarker position={{ lat, lng }} />
          </GoogleMap>
        </div>
      )}
      {loadError && <div>Error loading map</div>}
    </div>
  );
};

export default MapComponent;
