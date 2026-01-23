'use client';

import React from 'react';
import {
  useForm,
  type FieldValues,
  type Path,
  type RegisterOptions,
  type FieldErrors,
  type DefaultValues,
  Controller,
} from 'react-hook-form';
import { OptionSelect } from './SelectComponent';
import SelectComponent from './SelectComponent';
import Input from './Input';

type TextualInputType = 'text' | 'number' | 'password' | 'email';

export interface FormField<T extends FieldValues = FieldValues> {
  type: TextualInputType | 'select';
  name: Path<T>;
  label?: string;
  placeholder?: string;
  validation?: RegisterOptions<T, Path<T>>;
  options?: OptionSelect[];
  isMulti?: boolean;
  max?: number;
}

interface ReusableFormProps<T extends FieldValues = FieldValues> {
  defaultValues: DefaultValues<T>;
  fields: FormField<T>[];
  onSubmit: (data: T) => void;
  submitLabel?: string;
  className?: string;
  /** Si es true, y existe un campo de tipo 'email', deshabilita el submit mientras el email sea inválido */
  disableSubmitIfEmailInvalid?: boolean;
}

function getError<T extends FieldValues>(errors: FieldErrors<T>, name: Path<T>) {
  return ((errors as any)?.[name]?.message as string | undefined) ?? undefined;
}

export default function Form<T extends FieldValues = FieldValues>({
  defaultValues,
  fields,
  onSubmit,
  submitLabel = 'Submit',
  className,
  disableSubmitIfEmailInvalid = false,
}: ReusableFormProps<T>) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<T>({ defaultValues });

  // -------- Email gating opcional --------
  // Buscamos el primer campo de tipo 'email'
  const emailField = fields.find((f) => f.type === 'email')?.name as Path<T> | undefined;

  // RHF watch tipado con Path<T> puede ser quisquilloso; usamos un cast seguro
  const emailValue = emailField
    ? String((watch as unknown as (n: string) => unknown)(emailField as unknown as string) ?? '')
    : '';
  const emailValid =
    !disableSubmitIfEmailInvalid ||
    !emailField ||
    (emailValue.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue));

  const submitDisabled = !emailValid;

  const renderField = (field: FormField<T>) => {
    if (field.type === 'select') {
      return (
        <Controller
          key={String(field.name)}
          name={field.name}
          control={control}
          rules={field.validation}
          render={({ field: { value, onChange } }) => (
            <SelectComponent
              isSearchable={false}
              options={field.options ?? []}
              value={value}
              onChange={onChange}
              isMulti={field.isMulti}
              labelText={field.label}
              className="rs--no-caret"
              selectProps={{ classNamePrefix: 'rs' }}
            />
          )}
        />
      );
    }

    // Inputs textuales: text | number | password | email
    return (
      <Input
        key={String(field.name)}
        label={field.label}
        placeholder={field.placeholder}
        required={!!field.validation?.required}
        type={field.type as TextualInputType}
        maxLength={field.max}
        // RHF inyecta onChange/onBlur/name/ref
        {...register(field.name, field.validation)}
        // Error visual
        errorText={getError(errors, field.name)}
      />
    );
  };

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      console.log('🔧 Form component: handleSubmit called with:', data);
      await onSubmit(data);
      console.log('✅ Form component: onSubmit completed successfully');
    } catch (error) {
      console.error('❌ Form component: onSubmit error:', error);
      // Don't re-throw to prevent unhandled promise rejection
    }
  });

  return (
    <form
      onSubmit={(e) => {
        console.log('🔧 Form component: form onSubmit event triggered');
        e.preventDefault();
        e.stopPropagation();
        handleFormSubmit(e);
        return false;
      }}
      noValidate
      className={className}
    >
      <div className="flex flex-col gap-4">{fields.map((f) => renderField(f))}</div>

      <button
        type="submit"
        className="w-full mt-4 px-4 py-2 rounded bg-mulberry text-white disabled:opacity-60"
        disabled={submitDisabled}
        onClick={(e) => {
          console.log('🔧 Form component: submit button clicked');
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
