'use client';

import React from 'react';
import { useForm, FieldValues, Controller } from 'react-hook-form';
import SelectComponent, { OptionSelect } from '../SelectComponent';
import Input from '../Input';

export interface FormField {
  type: 'text' | 'select';
  name: string;
  label?: string;
  placeholder?: string;
  validation?: Object;
  options?: OptionSelect[]; // Only for select fields
  isMulti?: boolean; // Only for select fields
  max?: number; // Only for text fields
}

interface ReusableFormProps {
  defaultValues: FieldValues;
  fields: FormField[];
  onSubmit: (data: FieldValues) => void; // This prop is for client-side submission logic
}

const Form: React.FC<ReusableFormProps> = ({
  defaultValues,
  fields,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    control,
  } = useForm({
    defaultValues,
  });

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            key={field.name}
            labelText={field.label}
            placeholderText={field.placeholder}
            error={!!errors[field.name]}
            errorText={errors[field.name]?.message as string}
            setFormValue={(value: string) => setValue(field.name, value)}
            {...register(field.name, field.validation)}
            max={field.max}
          />
        );
      case 'select':
        return (
          <Controller
            key={field.name}
            name={field.name}
            control={control} // From useForm()
            rules={field.validation}
            render={({ field: { onChange, onBlur, value, name, ref } }) => (
              <SelectComponent
                options={field.options!}
                value={value}
                onChange={(selected) => onChange(selected)}
                isMulti={field.isMulti}
                labelText={field.label}
              />
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4">{fields.map(renderField)}</div>
      <button type="submit" className="mt-4">
        Submit
      </button>
    </form>
  );
};

export default Form;
