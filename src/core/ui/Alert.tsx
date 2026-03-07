'use client';

import React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: string; iconComponent: React.ElementType }
> = {
  success: {
    container: 'bg-success-light border-success text-success-foreground',
    icon: 'text-success',
    iconComponent: CheckCircleIcon,
  },
  warning: {
    container: 'bg-warning-light border-warning text-warning-foreground',
    icon: 'text-warning',
    iconComponent: ExclamationTriangleIcon,
  },
  error: {
    container: 'bg-error-light border-error text-error-foreground',
    icon: 'text-error',
    iconComponent: XCircleIcon,
  },
  info: {
    container: 'bg-info-light border-info text-info-foreground',
    icon: 'text-info',
    iconComponent: InformationCircleIcon,
  },
};

export function Alert({
  variant,
  title,
  children,
  dismissible = false,
  onDismiss,
  className = '',
}: AlertProps) {
  const styles = variantStyles[variant];
  const IconComponent = styles.iconComponent;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border p-4 ${styles.container} ${className}`}
    >
      <IconComponent className={`h-5 w-5 flex-shrink-0 ${styles.icon}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`flex-shrink-0 rounded-md p-1 hover:bg-black/5 transition-colors ${styles.icon}`}
          aria-label="Cerrar alerta"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Variantes de conveniencia
export function SuccessAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="success" {...props} />;
}

export function WarningAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="warning" {...props} />;
}

export function ErrorAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="error" {...props} />;
}

export function InfoAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="info" {...props} />;
}

export default Alert;
