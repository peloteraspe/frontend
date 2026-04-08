'use client';

import { useJsApiLoader } from '@react-google-maps/api';
import {
  GOOGLE_MAPS_LANGUAGE,
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_REGION,
  GOOGLE_MAPS_SCRIPT_ID,
} from '@shared/lib/googleMaps';

export function useGoogleMapsApi() {
  return useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: GOOGLE_MAPS_LANGUAGE,
    region: GOOGLE_MAPS_REGION,
  });
}
