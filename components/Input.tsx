import { ParagraphM } from './atoms/Typography';

interface InputProps {
  // Allow both controlled (labelText) and react-hook-form (label) props.
  labelText?: string;
  label?: string;
  placeholderText?: string;
  value?: string; // made optional
  setFormValue?: React.Dispatch<React.SetStateAction<string>>; // made optional
  required?: boolean;
  errorText?: string;
  // Form specific props are now optional.
  register?: any;
  name?: string;
  errors?: any;
  icon?: React.ReactNode;
  bgColor?: string;
  [x: string]: any;
}

const Input = ({
  label,
  register,
  required,
  name,
  errors,
  icon,
  bgColor = 'bg-transparent',
  ...rest
}: InputProps) => {
  return (
    <label className="w-full">
      {label && (
        <div className="mb-1">
          <ParagraphM fontWeight="semibold">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </ParagraphM>
        </div>
      )}
      <div className="relative">
        <input
          {...register(name, { required })}
          className={`... ${
            errors[name] ? 'border-red-500' : 'border-mulberry'
          } ${bgColor} w-full h-12 px-4 rounded-lg border-2 focus:outline-none focus:border-mulberry focus:ring-0`}
          {...rest}
        />
        {icon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
      {errors[name] && (
        <span className="text-sm text-red-500">
          {errors[name].message || 'Este campo es requerido'}
        </span>
      )}
    </label>
  );
};

export default Input;
