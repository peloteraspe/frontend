'use client';

import dynamic from 'next/dynamic';

const SubNav = dynamic(() => import('@modules/admin/ui/SubNav'), {
  loading: () => (
    <div className="h-16 bg-gray-100 rounded border animate-pulse flex items-center px-4">
      <div className="flex space-x-4">
        <div className="h-8 w-20 bg-gray-200 rounded" />
        <div className="h-8 w-20 bg-gray-200 rounded" />
        <div className="h-8 w-20 bg-gray-200 rounded" />
      </div>
    </div>
  ),
  ssr: false,
});

export default SubNav;
