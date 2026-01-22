'use client';

import dynamic from 'next/dynamic';
import { AdminLoading } from '@core/ui/Loading';

export const EventForm = dynamic(() => import('@app/admin/events/_components/EventFormComponent'), {
  loading: () => <AdminLoading />,
  ssr: false,
});
