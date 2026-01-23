'use client';

import dynamic from 'next/dynamic';
import { PaymentLoading } from '@core/ui/Loading';

export const PaymentStepper = dynamic(() => import('@modules/payments/ui/PaymentStepper'), {
  loading: () => <PaymentLoading />,
  ssr: false,
});

export const OperationNumberModal = dynamic(
  () => import('@modules/payments/ui/OperationNumberModal'),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);
