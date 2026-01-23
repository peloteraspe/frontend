'use client';

import dynamic from 'next/dynamic';
import type { SoccerFieldDynamicProps } from './SoccerFieldComponent';
import { SoccerFieldLoading } from '../Loading';

// Dynamic import for SoccerField (Three.js component) with loading state
const DynamicSoccerField = dynamic(
  () => import('./SoccerFieldComponent').then((mod) => mod.default),
  {
    loading: () => <SoccerFieldLoading />,
    ssr: false, // Disable SSR for Three.js components
  }
);

// Re-export with proper typing
const SoccerField: React.FC<SoccerFieldDynamicProps> = (props) => {
  return <DynamicSoccerField {...props} />;
};

// Re-export types for consumers
export type { SoccerFieldDynamicProps } from './SoccerFieldComponent';

export default SoccerField;
