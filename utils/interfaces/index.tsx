import { UseFormReturn } from "react-hook-form";

export interface FormProps extends UseFormReturn<any, any> {
  formInputs: any;
  register: any;
  setValue: any;
  getValues: any;
  watch: any;
  gap?: string;
  numberOfColumns?: number;
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  required?: boolean;
  error?: boolean;
  labelText?: string;
  placeholderText?: string;
  errorText?: string;
  setFormValue?: (arg: string) => void;
  type?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  value?: string;
  defaultValue?: string;
  isSearchable?: boolean;
}

export interface TextProps {
  type?: string;
  color?: string;
  children: React.ReactNode;
}

export interface TextAreaProps extends InputProps {
  rows?: number;
}

export interface InputDateProps extends InputProps {
  placeholderText?: string;
  setFormDate: (arg: Date) => void;
  formDate?: Date;
  disabled?: boolean;
}
