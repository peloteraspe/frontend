'use client';

import dynamic from 'next/dynamic';
import { AdminLoading } from '@core/ui/Loading';

const EventForm = dynamic(() => import('@modules/admin/ui/events/EventFormComponent'), {
  loading: () => <AdminLoading />,
  ssr: false,
});

export default EventForm;
