'use client';

import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@shared/lib/googleMaps';

const GOOGLE_MAPS_SCRIPT_ID = 'peloteras-google-maps';

export function useGoogleMapsApi() {
  const libraries = [...GOOGLE_MAPS_LIBRARIES];

  return useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries,
  });
}
