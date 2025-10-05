'use client';

import dynamic from 'next/dynamic';
import { 
  ComponentLoading, 
  MapLoading, 
  SoccerFieldLoading, 
  PaymentLoading, 
  AdminLoading 
} from './ui/Loading';

/**
 * Centralized dynamic imports for all heavy components
 * This file provides code-split versions of components to improve initial bundle size
 */

// =================== MAPS & LOCATION ===================

export const Map = dynamic(
  () => import('./Map'),
  {
    loading: () => <MapLoading />,
    ssr: false, // Maps require browser APIs
  }
);

export const InputLocation = dynamic(
  () => import('./InputLocation'),
  {
    loading: () => (
      <div className="min-h-[60px] bg-gray-50 rounded border animate-pulse flex items-center px-3">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </div>
    ),
    ssr: false,
  }
);

// =================== 3D COMPONENTS ===================

export const SoccerField = dynamic(
  () => import('./SoccerField'),
  {
    loading: () => <SoccerFieldLoading />,
    ssr: false, // Three.js requires browser APIs
  }
);

// =================== PAYMENT COMPONENTS ===================

export const PaymentStepper = dynamic(
  () => import('./PaymentStepper'),
  {
    loading: () => <PaymentLoading />,
    ssr: false, // Payment flows are interactive
  }
);

export const OperationNumberModal = dynamic(
  () => import('./OperationNumberModal'),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// =================== FORM COMPONENTS ===================

export const FormComponent = dynamic(
  () => import('./organisms/Form'),
  {
    loading: () => (
      <ComponentLoading 
        componentName="formulario"
        className="min-h-[300px] bg-gray-50 rounded border p-4"
      />
    ),
    ssr: false,
  }
);

export const SelectComponent = dynamic(
  () => import('./SelectComponent'),
  {
    loading: () => (
      <div className="min-h-[40px] bg-gray-50 rounded border animate-pulse">
        <div className="h-full bg-gray-200 rounded"></div>
      </div>
    ),
    ssr: false, // React-select has complex client-side logic
  }
);

// =================== ADMIN COMPONENTS ===================
// Note: Admin pages are not dynamically imported because they contain server actions
// Only admin UI components should be dynamically imported

export const EventForm = dynamic(
  () => import('../app/admin/events/_components/EventFormComponent'),
  {
    loading: () => (
      <div className="min-h-[500px] bg-white rounded border p-6 animate-pulse">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-28"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div className="h-10 bg-primary/20 rounded w-32"></div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// =================== CARD COMPONENTS ===================
// Note: CardEventList is a server component that calls server actions
// It should NOT be dynamically imported since it needs to run on the server

// =================== SIDEBAR COMPONENTS ===================

export const Sidebar = dynamic(
  () => import('./layout/sidebar/Sidebar'),
  {
    loading: () => (
      <div className="w-full md:w-80 bg-gray-50 rounded border p-4 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    ),
    ssr: true, // Sidebar can be server-rendered
  }
);

// Export everything as default for easy importing
export default {
  Map,
  InputLocation,
  SoccerField,
  PaymentStepper,
  OperationNumberModal,
  FormComponent,
  SelectComponent,
  EventForm,
  Sidebar,
};
