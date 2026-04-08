'use client';

import { CSSProperties, FocusEventHandler, InputHTMLAttributes, useId, useState } from 'react';
import { defaultCountries, type CountryIso2, PhoneInput, type PhoneInputProps } from 'react-international-phone';
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  type PhoneValidationResult,
} from '@shared/lib/phone';

type PhoneChangeMeta = Parameters<NonNullable<PhoneInputProps['onChange']>>[1];

type Props = {
  label?: string;
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  errorText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete'];
  className?: string;
  controlClassName?: string;
  inputClassName?: string;
  size?: 'md' | 'lg';
  defaultCountry?: CountryIso2;
  preferredCountries?: CountryIso2[];
  lockCountryToDefault?: boolean;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onChange?: (phone: string, meta: PhoneChangeMeta) => void;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export type InternationalPhoneFieldChangeMeta = PhoneChangeMeta;
export type InternationalPhoneFieldValidation = PhoneValidationResult;

export default function InternationalPhoneField({
  label,
  name,
  id,
  value,
  defaultValue = '',
  errorText,
  required,
  disabled,
  placeholder,
  autoFocus,
  autoComplete = 'tel',
  className,
  controlClassName,
  inputClassName,
  size = 'md',
  defaultCountry = DEFAULT_PHONE_COUNTRY_ISO2,
  preferredCountries = [DEFAULT_PHONE_COUNTRY_ISO2],
  lockCountryToDefault = false,
  onBlur,
  onFocus,
  onChange,
}: Props) {
  const generatedId = useId();
  const inputId = id || `international-phone-${generatedId.replace(/:/g, '')}`;
  const errorId = `${inputId}-error`;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = isControlled ? value || '' : internalValue;
  const hasError = Boolean(errorText);
  const availableCountries = lockCountryToDefault
    ? defaultCountries.filter((country) => country[1] === defaultCountry)
    : undefined;

  const height = size === 'lg' ? '3rem' : '2.75rem';

  return (
    <label className={cn('block w-full', className)} htmlFor={inputId}>
      {label ? (
        <div className="mb-1 text-sm font-semibold text-slate-700">
          {label}
          {required ? <span className="text-error"> *</span> : null}
        </div>
      ) : null}

      <PhoneInput
        value={currentValue}
        defaultCountry={defaultCountry}
        countries={availableCountries}
        preferredCountries={preferredCountries}
        hideDropdown={lockCountryToDefault}
        disableCountryGuess={lockCountryToDefault}
        forceDialCode
        disableDialCodePrefill={false}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        onBlur={onBlur}
        onFocus={onFocus}
        onChange={(phone, meta) => {
          if (!isControlled) setInternalValue(phone);
          onChange?.(phone, meta);
        }}
        className={cn(
          'peloteras-phone-input',
          hasError
            ? 'border-error hover:border-error focus-within:border-error focus-within:ring-4 focus-within:ring-error/10'
            : 'border-slate-300 hover:border-slate-400 focus-within:border-mulberry focus-within:ring-4 focus-within:ring-mulberry/10',
          disabled && 'opacity-70',
          controlClassName
        )}
        style={
          {
            '--peloteras-phone-height': height,
          } as CSSProperties
        }
        inputClassName={cn('peloteras-phone-input__field', inputClassName)}
        inputProps={{
          id: inputId,
          autoComplete,
          inputMode: 'tel',
          'aria-invalid': hasError || undefined,
          'aria-describedby': hasError ? errorId : undefined,
        }}
        countrySelectorStyleProps={{
          className: 'peloteras-phone-input__selector',
          buttonClassName: 'peloteras-phone-input__selector-button',
          dropdownStyleProps: {
            className: 'peloteras-phone-input__dropdown',
            listItemClassName: 'peloteras-phone-input__dropdown-item',
            listItemPreferredClassName: 'peloteras-phone-input__dropdown-item--preferred',
            listItemSelectedClassName: 'peloteras-phone-input__dropdown-item--selected',
            listItemFocusedClassName: 'peloteras-phone-input__dropdown-item--focused',
            listItemCountryNameClassName: 'peloteras-phone-input__dropdown-country',
            listItemDialCodeClassName: 'peloteras-phone-input__dropdown-dial-code',
            preferredListDividerClassName: 'peloteras-phone-input__dropdown-divider',
          },
        }}
      />

      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      {hasError ? (
        <span id={errorId} className="mt-1 block text-sm text-error">
          {errorText}
        </span>
      ) : null}
    </label>
  );
}
