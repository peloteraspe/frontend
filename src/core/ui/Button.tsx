'use client';
import { useRouter } from 'next/navigation';
import React from 'react';

type WidthProp = 'fit-content' | 'full' | number;

interface BaseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  hovered?: string;
  width?: WidthProp;
  icon?: React.ReactNode;
  disabled?: boolean;
  bg?: string;
  border?: string;
  navigateTo?: string;
  iconDirection?: 'left' | 'right';
  htmlType?: 'button' | 'submit' | 'reset'; // alias por si lo usas así
}

export interface ButtonWrapperProps extends BaseProps {}

const getWidthClass = (width?: WidthProp) => {
  if (width === 'fit-content') return 'w-fit';
  if (width === 'full' || width === undefined) return 'w-full';
  if (typeof width === 'number') return `w-[${width}px]`;
  return 'w-full';
};

export const ButtonWrapper: React.FC<ButtonWrapperProps> = ({
  width,
  icon,
  disabled,
  onClick,
  children,
  navigateTo,
  iconDirection = 'right',
  className,
  type, // nativo
  htmlType, // alias
  ...rest
}) => {
  const router = useRouter();
  const buttonWidth = getWidthClass(width);

  const isSubmit = (htmlType ?? type ?? 'button') === 'submit';

  const baseEnabled = 'cursor-pointer bg-btnBg-light hover:bg-btnBg-dark hover:shadow';
  const baseDisabled = 'cursor-not-allowed bg-gray-500';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Si es submit, dejamos que el <form> maneje el envío
    if (isSubmit) return;

    if (onClick) onClick(e);
    if (navigateTo) router.push(navigateTo);
  };

  return (
    <button
      type={(htmlType as any) ?? (type as any) ?? 'button'}
      className={[
        buttonWidth,
        'px-4 py-3 font-semibold text-white rounded-xl my-0 flex justify-center items-center relative box-border transition-colors',
        disabled ? baseDisabled : baseEnabled,
        className ?? '',
      ].join(' ')}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      {icon && iconDirection === 'left' && children && (
        <>
          <div className="mr-2">{icon}</div>
          {children}
        </>
      )}
      {icon && iconDirection === 'right' && children && (
        <>
          {children}
          <div className="ml-2">{icon}</div>
        </>
      )}
      {!icon && children && <>{children}</>}
      {icon && !children && <div style={{ minWidth: 'min-content' }}>{icon}</div>}
    </button>
  );
};

export const ButtonWrapperOutline: React.FC<ButtonWrapperProps> = ({
  bg = 'bg-transparent',
  width = 'fit-content',
  icon,
  disabled,
  onClick,
  children,
  className,
  type,
  htmlType,
  ...rest
}) => {
  const buttonWidth = getWidthClass(width);
  const isSubmit = (htmlType ?? type ?? 'button') === 'submit';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isSubmit) return;
    onClick?.(e);
  };

  return (
    <button
      type={(htmlType as any) ?? (type as any) ?? 'button'}
      className={[
        buttonWidth,
        `px-4 py-3 ${bg} font-semibold text-btnBg-light border-2 border-btnBg-light hover:border-btnBg-dark hover:text-btnBg-dark rounded-xl my-0 mx-2 flex justify-center items-center relative box-border transition-colors`,
        disabled ? 'cursor-auto' : 'cursor-pointer',
        className ?? '',
      ].join(' ')}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      {icon && !children && <div style={{ minWidth: 'min-content' }}>{icon}</div>}
      {icon && children && <div className="mr-2">{icon}</div>}
      {children}
    </button>
  );
};

export const ButtonUnWrapperOutline: React.FC<ButtonWrapperProps> = ({
  bg = 'bg-transparent',
  width = 'fit-content',
  icon,
  disabled,
  onClick,
  children,
  className,
  type,
  htmlType,
  ...rest
}) => {
  const buttonWidth = getWidthClass(width);
  const isSubmit = (htmlType ?? type ?? 'button') === 'submit';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isSubmit) return;
    onClick?.(e);
  };

  return (
    <button
      type={(htmlType as any) ?? (type as any) ?? 'button'}
      className={[
        buttonWidth,
        `px-4 py-3 ${bg} font-semibold text-btnBg-light hover:bg-btnBg-trans hover:text-btnBg-dark rounded-xl my-0 flex justify-center items-center relative box-border transition-colors`,
        disabled ? 'cursor-auto' : 'cursor-pointer',
        className ?? '',
      ].join(' ')}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      {icon && !children && <div style={{ minWidth: 'min-content' }}>{icon}</div>}
      {icon && children && <div className="mr-2">{icon}</div>}
      {children}
    </button>
  );
};

const colorClassMap: Record<string, { text: string; border: string; bg?: string }> = {
  // Colores de marca
  primary: { text: 'text-primary', border: 'border-primary', bg: 'bg-primary' },
  mulberry: { text: 'text-mulberry', border: 'border-mulberry', bg: 'bg-mulberry' },
  plum: { text: 'text-plum', border: 'border-plum', bg: 'bg-plum' },
  white: { text: 'text-white', border: 'border-white', bg: 'bg-white' },
  // Estados semanticos
  success: { text: 'text-success-foreground', border: 'border-success', bg: 'bg-success' },
  warning: { text: 'text-warning-foreground', border: 'border-warning', bg: 'bg-warning' },
  error: { text: 'text-error-foreground', border: 'border-error', bg: 'bg-error' },
  info: { text: 'text-info-foreground', border: 'border-info', bg: 'bg-info' },
};

export const ButtonHover: React.FC<ButtonWrapperProps> = ({
  color = 'mulberry',
  bg = 'bg-transparent',
  width = 'fit-content',
  icon,
  disabled,
  onClick,
  children,
  className,
  type,
  htmlType,
  ...rest
}) => {
  const buttonWidth = getWidthClass(width);
  const colorClasses = colorClassMap[color] || colorClassMap.mulberry;
  const isSubmit = (htmlType ?? type ?? 'button') === 'submit';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isSubmit) return;
    onClick?.(e);
  };

  return (
    <button
      type={(htmlType as any) ?? (type as any) ?? 'button'}
      className={[
        buttonWidth,
        `px-4 py-3 ${bg} font-semibold ${colorClasses.text} hover:border-2 ${colorClasses.border} rounded-xl my-0 mx-2 flex justify-center items-center relative box-border transition-colors`,
        disabled ? 'cursor-auto' : 'cursor-pointer',
        className ?? '',
      ].join(' ')}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      {icon && children && (
        <div className="mr-2">
          {icon} {children}
        </div>
      )}
      {icon && !children && <div style={{ minWidth: 'min-content' }}>{icon}</div>}
      {!icon && children && <>{children}</>}
    </button>
  );
};
