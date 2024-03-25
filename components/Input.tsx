'use client';
import React, { useState } from 'react';
import { ParagraphM } from './atoms/Typography';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  required?: boolean;
  error?: boolean;
  labelText?: string;
  placeholderText?: string;
  errorText?: string;
  setFormValue?: (arg: string) => void;
  onErrorChange?: (error: boolean) => void;
  type?: string;
  disabled?: boolean;
  max?: number;
  value?: string;
  icon?: React.ReactNode;
}

export default function Input({
  required,
  error,
  labelText,
  placeholderText,
  errorText = 'Error Text',
  setFormValue,
  onErrorChange,
  disabled,
  type,
  max,
  value,
  icon,
}: InputProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [inputError, setInputError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setFormValue && setFormValue(newValue);
    setInputError(false);
  };

  const handleBlur = () => {
    let error = false;

    switch (type) {
      case 'text':
        if (!/^[A-Za-z\s]+$/.test(inputValue)) {
          error = true;
        }
        break;
      case 'number':
        if (!/^\d+$/.test(inputValue)) {
          error = true;
        }
        break;
      case 'email':
        if (
          !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(inputValue)
        ) {
          error = true;
        }
        break;
      default:
        break;
    }

    setInputError(error);
    onErrorChange && onErrorChange(error);
    console.log(error);
  };

  return (
    <label className="w-full">
      {labelText && (
        <div className="mb-1">
          <ParagraphM fontWeight="semibold">
            {labelText}
            {required && <span className="text-red-500"> *</span>}
          </ParagraphM>
        </div>
      )}
      <div className="relative">
        <input
          className={`${
            disabled
              ? 'bg-inputBg'
              : 'py-2 px-3 bg-inputBg focus:outline-none h-[44px] text-sm  focus:ring-2 focus:ring-secondary focus:ring-opacity-50'
          } transition duration-150 appearance-none rounded-xl w-full text-black leading-tight hover:outline-none placeholder:text-lightGray ${
            inputError || error ? 'border-red-500' : 'border-transparent'
          }`}
          placeholder={placeholderText}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          min={1}
          step={1}
          onInput={(e) => {
            e.currentTarget.validity.valid || (e.currentTarget.value = '');
          }}
          max={max}
          value={inputValue}
        />
        {icon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
      {inputError || error ? (
        <span className="text-sm text-red-500">{errorText}</span>
      ) : null}
    </label>
  );
}
