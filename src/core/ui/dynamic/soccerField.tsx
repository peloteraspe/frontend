'use client';

import dynamic from 'next/dynamic';
import { SoccerFieldLoading } from '@core/ui/Loading';

export const SoccerField = dynamic(() => import('@core/ui/SoccerField'), {
  loading: () => <SoccerFieldLoading />,
  ssr: false,
});
