import React, { FC } from 'react';
import { Text } from './Text';
import { InputProps } from '@/utils/interfaces';

export const Input: FC<InputProps> = ({
  required,
  error,
  labelText,
  placeholderText,
  errorText = 'Error Text',
  setFormValue,
  disabled,
  type,
  min,
  max,
  value,
  defaultValue,
  isSearchable,
}) => {
  return (
    <label className="w-full">
      {labelText && (
        <div className="mb-1 flex">
          <Text color="black">{labelText}</Text>
          {required && <Text color="black"> *</Text>}
        </div>
      )}
      <div style={{ width: 'inherit' }} className="relative cursor-pointer">
        <input
          className={`${
            disabled
              ? 'bg-white'
              : 'py-2 px-3  focus:outline-none focus:border-primary hover:border-primary h-[42px]'
          } disabled:border-transparent transition duration-150 appearance-none border border-lightGray rounded-xl w-full  text-gray-700 leading-tight  hover:outline-none placeholder:text-lightGray`}
          type={type}
          placeholder={placeholderText}
          onChange={(e) => {
            setFormValue && setFormValue(e.target.value);
          }}
          disabled={disabled}
          min={min}
          step={1}
          onInput={(e) => {
            e.currentTarget.validity.valid || (e.currentTarget.value = '');
          }}
          max={max}
          value={value && value}
          defaultValue={defaultValue && defaultValue}
        />
      </div>

      {error && <Text color="red">{errorText}</Text>}
    </label>
  );
};
