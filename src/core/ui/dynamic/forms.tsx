'use client';

import dynamic from 'next/dynamic';
import { ComponentLoading } from '@core/ui/Loading';

export const FormComponent = dynamic(() => import('@core/ui/Form'), {
  loading: () => (
    <ComponentLoading
      componentName="formulario"
      className="min-h-[300px] bg-gray-50 rounded border p-4"
    />
  ),
  ssr: false,
});

export const SelectComponent = dynamic(() => import('@core/ui/SelectComponent'), {
  loading: () => (
    <div className="min-h-[40px] bg-gray-50 rounded border animate-pulse">
      <div className="h-full bg-gray-200 rounded" />
    </div>
  ),
  ssr: false,
});
