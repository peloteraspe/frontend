'use client';

import React, { forwardRef, InputHTMLAttributes, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
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
  const isPasswordField = rest.type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : rest.type;

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
            'w-full h-12 rounded-lg border-2 px-4 focus:outline-none focus:border-mulberry focus:ring-0',
            isPasswordField || icon ? 'pr-12' : '',
            bgColor,
            hasError ? 'border-red-500' : 'border-mulberry',
            className || '',
          ].join(' ')}
          {...rest}
          type={inputType}
        />
        {isPasswordField ? (
          <button
            type="button"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition-colors hover:text-slate-900"
          >
            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        ) : (
          icon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {icon}
            </div>
          )
        )}
      </div>

      {hasError && (
        <span className="text-sm text-red-500">{errorText || 'Este campo es requerido'}</span>
      )}
    </label>
  );
});

export default Input;
