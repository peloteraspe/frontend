import React, { FC } from 'react';
import { Text } from '../atoms';
import { TextAreaProps } from '@/utils/interfaces';

export const TextArea: FC<TextAreaProps> = ({
  required,
  error,
  labelText,
  placeholderText = 'Field Text',
  errorText = 'Error Text',
  setFormValue,
  disabled,
  rows,
}) => {
  return (
    <label className="h-full">
      {labelText && (
        <div className="mb-1">
          <Text color="black">
            {labelText}
            {required && <Text color="black"> *</Text>}
          </Text>
        </div>
      )}
      <div>
        <textarea
          className={`${
            disabled
              ? 'bg-white resize-none'
              : 'py-2 px-3 focus:shadow-[0_0_0_0.2rem_#B92CCF] focus:outline-none focus:border-primary hover:border-primary'
          } disabled:border-transparent transition duration-150 appearance-none border border-lightGray rounded-xl w-full  text-gray-700 leading-tight  hover:outline-none`}
          placeholder={placeholderText}
          onChange={(e) => {
            setFormValue(e.target.value);
          }}
          disabled={disabled}
          rows={rows}
        />
      </div>

      {error && <Text color="red">{errorText}</Text>}
    </label>
  );
};
