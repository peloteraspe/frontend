'use client';

import dynamic from 'next/dynamic';
import { MapLoading } from '@core/ui/Loading';

export const Map = dynamic(() => import('@core/ui/Map'), {
  loading: () => <MapLoading />,
  ssr: false,
});

export const InputLocation = dynamic(() => import('@core/ui/InputLocation'), {
  loading: () => (
    <div className="min-h-[60px] bg-gray-50 rounded border animate-pulse flex items-center px-3">
      <div className="h-4 bg-gray-200 rounded w-48" />
    </div>
  ),
  ssr: false,
});
