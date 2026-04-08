'use client';

import React, { forwardRef, InputHTMLAttributes, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { ParagraphM } from '@core/ui/Typography';

type InputProps = {
  label?: string;
  errorText?: string;
  icon?: React.ReactNode;
  bgColor?: string;
  tone?: 'default' | 'soft';
} & InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, required, errorText, icon, bgColor = '', tone: _tone = 'default', className, ...rest },
  ref
) {
  const hasError = Boolean(errorText);
  const isPasswordField = rest.type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : rest.type;
  const baseInputClass = 'peloteras-form-control h-11';
  const stateClass = hasError ? 'peloteras-form-control--error' : '';

  return (
    <label className="block w-full">
      {label && (
        <div className="mb-1">
          <ParagraphM fontWeight="semibold">
            {label}
            {required && <span className="text-error"> *</span>}
          </ParagraphM>
        </div>
      )}

      <div className="relative">
        <input
          ref={ref}
          className={[
            baseInputClass,
            stateClass,
            isPasswordField || icon ? 'pr-12' : '',
            bgColor,
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
            className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-slate-500 transition-colors hover:bg-mulberry/5 hover:text-slate-900 focus:outline-none"
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
        <span className="text-sm text-error">{errorText || 'Este campo es requerido'}</span>
      )}
    </label>
  );
});

export default Input;
