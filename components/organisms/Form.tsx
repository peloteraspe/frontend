'use client';

import React from 'react';
import { useForm, FieldValues, Controller } from 'react-hook-form';
import SelectComponent, { OptionSelect } from '../SelectComponent';
import Input from '../Input';

export interface FormField {
  type: string;
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
  form: any; // This prop is for server-side submission logic
}

const Form: React.FC<ReusableFormProps> = ({ defaultValues, fields, form }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = form;
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
    <>
      <div className="flex flex-col gap-4">{fields.map(renderField)}</div>
    </>
  );
};

export default Form;
