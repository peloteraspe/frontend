import { ParagraphM } from './atoms/Typography';
const Input = ({
  label,
  register,
  required,
  name,
  errors,
  icon,
  bgColor = 'bg-inputBg',
  ...rest
}: {
  label?: string;
  register: any;
  required: boolean;
  name: string;
  errors: any;
  icon?: React.ReactNode;
  bgColor?: string;
  [x: string]: any;
}) => {
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
          className={`py-2 px-3 focus:outline-none h-[44px] text-sm focus:ring-2 focus:ring-secondary focus:ring-opacity-50 transition duration-150 appearance-none rounded-xl w-full text-black leading-tight hover:outline-none placeholder:text-lightGray ${
            errors[name] ? 'border-red-500' : 'border-mulberry'
          } ${bgColor}`}
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
