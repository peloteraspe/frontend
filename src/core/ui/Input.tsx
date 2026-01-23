'use client';

import React, { forwardRef, InputHTMLAttributes } from 'react';
import { ParagraphM } from '@core/ui/Typography';

type InputProps = {
  label?: string;
  errorText?: string;
  icon?: React.ReactNode;
  bgColor?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, required, errorText, icon, bgColor = 'bg-transparent', className, ...rest },
  ref
) {
  const hasError = Boolean(errorText);

  return (
    <label className="w-full">
      {label && (
        <div className="mb-1">
          <ParagraphM fontWeight="semibold">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </ParagraphM>
        </div>
      )}

      <div className="relative">
        <input
          ref={ref}
          className={[
            'w-full h-12 px-4 rounded-lg border-2 focus:outline-none focus:border-mulberry focus:ring-0',
            bgColor,
            hasError ? 'border-red-500' : 'border-mulberry',
            className || '',
          ].join(' ')}
          {...rest}
        />
        {icon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {icon}
          </div>
        )}
      </div>

      {hasError && (
        <span className="text-sm text-red-500">{errorText || 'Este campo es requerido'}</span>
      )}
    </label>
  );
});

export default Input;
