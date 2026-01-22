'use client';

import dynamic from 'next/dynamic';
import { AdminLoading } from '@src/core/ui/Loading';

// Note: Admin pages are not dynamically imported because they contain server actions
// and need to remain as server components. Only specific UI components within
// admin pages should be dynamically imported if needed.

// Event form component
export const DynamicEventForm = dynamic(() => import('../events/_components/EventFormComponent'), {
  loading: () => (
    <div className="min-h-[400px] bg-gray-50 rounded border p-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  ),
  ssr: false,
});

// SubNav component for admin
export const DynamicSubNav = dynamic(() => import('../_components/SubNav'), {
  loading: () => (
    <div className="h-16 bg-gray-100 rounded border animate-pulse flex items-center px-4">
      <div className="flex space-x-4">
        <div className="h-8 w-20 bg-gray-200 rounded"></div>
        <div className="h-8 w-20 bg-gray-200 rounded"></div>
        <div className="h-8 w-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  ),
  ssr: false,
});
