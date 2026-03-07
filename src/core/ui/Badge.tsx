import CloudIcon from '@shared/ui/icons/CloudIcon';
import React from 'react';

// ============================================
// Badge Original (mantiene compatibilidad)
// ============================================
interface BadgeProps {
  badgeType: 'Primary' | 'Secondary' | 'Third';
  text: string;
  icon: boolean;
}

const Badge = ({ badgeType, text, icon }: BadgeProps) => {
  const baseStyle =
    'text-btnBg-light px-3 py-1 rounded-lg h-7 text-center leading-5 font-poppins text-sm font-medium';
  const iconStyle = 'flex justify-center items-center gap-2';
  const cloudColor =
    badgeType === 'Primary' ? 'btnBg-light' : badgeType === 'Secondary' ? 'btnBg-light' : 'white';

  const style = [
    baseStyle,
    badgeType === 'Primary'
      ? 'bg-plum/40'
      : badgeType === 'Secondary'
        ? 'bg-white border-2 border-btnBg-light !leading-4'
        : 'bg-btnBg-light text-white',
    icon ? 'w-full' : 'w-auto',
    icon ? iconStyle : '',
  ].join(' ');

  return (
    <div>
      {icon ? (
        <>
          <div className={`${style}`}>
            {icon && <CloudIcon color={cloudColor} />}
            {text}
          </div>
        </>
      ) : (
        <div className={`${style}`}>{text}</div>
      )}
    </div>
  );
};

export default Badge;

// ============================================
// StatusBadge - Nuevo componente con tokens semanticos
// ============================================
type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
type StatusSize = 'sm' | 'md';

interface StatusBadgeProps {
  variant?: StatusVariant;
  size?: StatusSize;
  children: React.ReactNode;
  className?: string;
}

const statusVariantStyles: Record<StatusVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-success-light text-success-foreground',
  warning: 'bg-warning-light text-warning-foreground',
  error: 'bg-error-light text-error-foreground',
  info: 'bg-info-light text-info-foreground',
};

const statusSizeStyles: Record<StatusSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function StatusBadge({
  variant = 'default',
  size = 'sm',
  children,
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${statusVariantStyles[variant]} ${statusSizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}

// Variantes de conveniencia
export function SuccessBadge(props: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="success" {...props} />;
}

export function WarningBadge(props: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="warning" {...props} />;
}

export function ErrorBadge(props: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="error" {...props} />;
}

export function InfoBadge(props: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="info" {...props} />;
}
