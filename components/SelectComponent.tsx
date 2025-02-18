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
  control?: any; // Optional, for react-hook-form usage
  name?: string; // Optional, for react-hook-form usage
  labelText?: string;
  required?: boolean;
  isMulti?: boolean;
  isSearchable?: boolean;
  // Add controlled component props:
  onChange?: (value: any) => void;
  value?: any;
}

const SelectComponent: React.FC<SelectComponentProps> = ({
  options,
  control,
  name,
  labelText,
  required = false,
  isMulti = false,
  onChange, // controlled prop
  value, // controlled prop
  ...rest
}) => {
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
      {control && name ? (
        // If react-hook-form props are provided, use Controller:
        <Controller
          name={name}
          control={control}
          render={({
            field: { onChange: rhfOnChange, onBlur, value: rhfValue, ref },
          }) => {
            const selectedValue = isMulti
              ? options.filter((option) =>
                  rhfValue?.map((v: any) => v).includes(option.value)
                )
              : options.find((option) => option.value === rhfValue);
            return (
              <Select
                ref={ref}
                options={options}
                isMulti={isMulti}
                components={animatedComponents}
                classNamePrefix="select"
                value={selectedValue}
                onChange={(selected: any) => {
                  rhfOnChange(
                    isMulti
                      ? selected.map((item: any) => item.value)
                      : selected?.value
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
                {...rest}
              />
            );
          }}
        />
      ) : (
        // Otherwise, use controlled props:
        <Select
          options={options}
          isMulti={isMulti}
          components={animatedComponents}
          classNamePrefix="select"
          value={value}
          onChange={onChange}
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
          {...rest}
        />
      )}
    </div>
  );
};

export default SelectComponent;
