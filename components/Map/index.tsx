'use client';

import dynamic from 'next/dynamic';
import { MapLoading } from '../ui/Loading';
import type { ComponentType } from 'react';

// Define the props interface for the Map component
interface MapProps {
  lat: number;
  lng: number;
}

// Dynamic import for the Map component with loading state
const DynamicMap = dynamic(
  () => import('./MapComponent').then((mod) => mod.default),
  {
    loading: () => <MapLoading />,
    ssr: false, // Disable SSR for Maps as they require browser APIs
  }
) as ComponentType<MapProps>;

// Re-export with proper typing
const Map: React.FC<MapProps> = (props) => {
  return <DynamicMap {...props} />;
};

export default Map;
