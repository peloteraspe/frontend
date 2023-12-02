"use client";
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import React from 'react';

interface MapProps {
  lat: number;
  lng: number;
}

const Map: React.FC<MapProps> = ({ lat, lng }) => {
    console.log('Map.tsx: lat, lng', lat, lng)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: ['places'],
  });
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
                <Marker position={{ lat, lng }} />
        </GoogleMap>
        </div>
      )}
      {loadError && <div>Error loading map</div>}
    </div>
  );
};

export default Map;
