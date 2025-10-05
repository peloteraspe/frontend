'use client';

import dynamic from 'next/dynamic';
import { ComponentLoading } from '../ui/Loading';

// Dynamic import for InputLocation with loading state
const DynamicInputLocation = dynamic(
  () => import('./InputLocationComponent'),
  {
    loading: () => (
      <ComponentLoading 
        componentName="selector de ubicación"
        className="min-h-[60px] bg-gray-50 rounded border animate-pulse"
      />
    ),
    ssr: false, // Disable SSR for Google Maps components
  }
);

// Re-export with proper component name
const InputLocation: React.FC = () => {
  return <DynamicInputLocation />;
};

export default InputLocation;
