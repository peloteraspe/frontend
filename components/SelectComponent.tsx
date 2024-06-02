import React from 'react';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import { Controller } from 'react-hook-form';
import { ParagraphM } from './atoms/Typography';

const animatedComponents = makeAnimated();

export interface OptionSelect {
  key?: number;
  value: string | number;
  label: string;
}

interface SelectComponentProps {
  options: OptionSelect[];
  control: any;
  name: string;
  labelText?: string;
  required?: boolean;
  isMulti?: boolean;
  isSearchable?: boolean;
}

const SelectComponent: React.FC<SelectComponentProps> = ({
  options,
  control,
  name,
  labelText,
  required = false,
  isMulti = false,
}) => {
  console.log('isMulti', isMulti);
  return (
    <div className="w-full">
      {labelText && (
        <div className="mb-1">
          <ParagraphM fontWeight="semibold">
            {labelText}
            {required && <span className="text-red-500"> *</span>}
          </ParagraphM>
        </div>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, onBlur, value, ref } }) => {
          const selectedValue = isMulti
            ? options.filter((option) => value.map((v) => v.value).includes(option.value))
            : options.find((option) => option.value === value);
          return (
            <Select
              ref={ref}
              options={options}
              isMulti={isMulti}
              components={animatedComponents}
              classNamePrefix="select"
              value={selectedValue}
              onChange={(selected: any) => {
                onChange(
                  isMulti ? selected.map((item) => item.value) : selected?.value
                );
              }}
              onBlur={onBlur}
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: 'purple',
                  '&:hover': { borderColor: 'darkpurple' },
                  boxShadow: 'none',
                }),
              }}
              placeholder="Select option"
              noOptionsMessage={() => 'No options'}
            />
          );
        }}
      />
    </div>
  );
};

export default SelectComponent;
