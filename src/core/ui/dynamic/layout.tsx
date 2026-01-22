'use client';

import dynamic from 'next/dynamic';

export const Sidebar = dynamic(() => import('@core/ui/Sidebar'), {
  loading: () => (
    <div className="w-full md:w-80 bg-gray-50 rounded border p-4 animate-pulse">
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  ),
  ssr: true,
});
