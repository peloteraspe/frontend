'use client';

import dynamic from 'next/dynamic';
import { AdminLoading } from '@core/ui/Loading';

export const EventForm = dynamic(() => import('@src/modules/admin/ui/events/EventFormComponent'), {
  loading: () => <AdminLoading />,
  ssr: false,
});
