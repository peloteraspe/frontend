'use client';

import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Cargando...',
  size = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary ${sizeClasses[size]} mb-2`}
        aria-label="Loading"
      />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
};

interface ComponentLoadingProps {
  componentName?: string;
  className?: string;
}

export const ComponentLoading: React.FC<ComponentLoadingProps> = ({
  componentName,
  className = 'min-h-[200px]'
}) => {
  const message = componentName ? `Cargando ${componentName}...` : 'Cargando componente...';
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <LoadingSpinner message={message} size="medium" />
    </div>
  );
};

// Specific loading components for different use cases
export const MapLoading: React.FC = () => (
  <ComponentLoading 
    componentName="mapa"
    className="min-h-[400px] bg-gray-100 rounded-lg border"
  />
);

export const SoccerFieldLoading: React.FC = () => (
  <ComponentLoading 
    componentName="cancha 3D"
    className="min-h-[300px] bg-gradient-to-b from-green-100 to-green-200 rounded-lg border"
  />
);

export const PaymentLoading: React.FC = () => (
  <ComponentLoading 
    componentName="sistema de pago"
    className="min-h-[500px] bg-gray-50 rounded-lg border p-6"
  />
);

export const AdminLoading: React.FC = () => (
  <ComponentLoading 
    componentName="panel de administración"
    className="min-h-[400px] bg-gray-50 rounded-lg border p-6"
  />
);

export default LoadingSpinner;
