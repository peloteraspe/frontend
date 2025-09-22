import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';

import Input from '@/components/Input';
import { ButtonWrapper } from '@/components/Button';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'email' | 'select' | 'select-multiple';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

interface FormProps {
  fields: FormField[];
  onSubmit: (data: any) => void;
  buttonText?: string;
  isSubmitDisabled?: boolean;
  defaultValues?: Record<string, any>;
}

const Form: React.FC<FormProps> = ({
  fields,
  onSubmit,
  buttonText = 'Continuar',
  isSubmitDisabled,
  defaultValues,
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm({ defaultValues });

  const emailVal: string = (watch('email') || '').trim();
  const isValidEmail = emailVal.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);

  const disabled = typeof isSubmitDisabled === 'boolean' ? isSubmitDisabled : !isValidEmail;

  return (
    <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => {
        const isSelect = field.type === 'select' || field.type === 'select-multiple';

        if (isSelect) {
          return (
            <div key={field.name} className="flex flex-col">
              <label className="text-gray-700 font-medium">{field.label}</label>
              <Controller
                name={field.name}
                control={control}
                rules={{ required: !!field.required }}
                render={({ field: selectField }) => (
                  <Select
                    {...selectField}
                    options={field.options}
                    isMulti={field.type === 'select-multiple'}
                    className="mt-1"
                    classNamePrefix="react-select"
                  />
                )}
              />
              {errors[field.name] && (
                <span className="text-red-500 text-sm mt-1">Este campo es obligatorio</span>
              )}
            </div>
          );
        }

        return (
          <Input
            key={field.name}
            register={register}
            errors={errors}
            name={field.name}
            label={field.label}
            type={field.type as 'text' | 'number' | 'password' | 'email'}
            placeholder={field.placeholder}
            required={!!field.required}
            error={errors[field.name]}
          />
        );
      })}

      <div className="flex flex-col items-stretch w-full">
        <ButtonWrapper type="submit" width="full" className="h-11" disabled={disabled}>
          {buttonText}
        </ButtonWrapper>
      </div>
    </form>
  );
};

export default Form;
