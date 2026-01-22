'use client';

import dynamic from 'next/dynamic';
import { AdminLoading } from '@src/core/ui/Loading';

// Dynamic import for EventForm with loading state
const DynamicEventForm = dynamic(() => import('./EventFormComponent'), {
  loading: () => <AdminLoading />,
  ssr: false, // Admin components often have complex client-side logic
});

// Re-export the component
const EventForm = DynamicEventForm;

export default EventForm;
