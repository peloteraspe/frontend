import React, { useState } from "react";
import { ParagraphM } from "./atoms/Typography";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  required?: boolean;
  error?: boolean;
  labelText?: string;
  placeholderText?: string;
  errorText?: string;
  setFormValue?: (arg: string) => void;
  type?: string;
  disabled?: boolean;
  max?: number;
  value?: string;
  icon?: React.ReactNode;
}

export default function Input({
  required,
  error,
  labelText,
  placeholderText,
  errorText = "Error Text",
  setFormValue,
  disabled,
  type,
  max,
  value,
  icon,
}: InputProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const [inputError, setInputError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setFormValue && setFormValue(newValue); // If setFormValue is provided, call it with the new value
    setInputError(false); // Reset error when input changes
  };

  const handleBlur = () => {
    switch (type) {
      case "text":
        if (!/^[A-Za-z\s]+$/.test(inputValue)) {
          setInputError(true);
        }
        break;
      case "number":
        if (!/^\d+$/.test(inputValue)) {
          setInputError(true);
        }
        break;
      case "email":
        if (
          !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(inputValue)
        ) {
          setInputError(true);
        }
        break;
      default:
        break;
    }
  };

  return (
    <label className="w-full">
      {labelText && (
        <div className="mb-1">
          <ParagraphM fontWeight="semibold">
            {labelText}
            {required && <span className="text-red-500"> *</span>}
          </ParagraphM>
        </div>
      )}
      <div className="relative">
        <input
          className={`${
            disabled
              ? "bg-inputBg"
              : "py-2 px-3 bg-inputBg focus:outline-none h-[38px] text-sm "
          } disabled:border-transparent transition duration-150 appearance-none border border-lightGray rounded-xl w-full text-black leading-tight hover:outline-none placeholder:text-lightGray ${
            inputError ? "border-red-500" : ""
          }`}
          placeholder={placeholderText}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          min={1}
          step={1}
          onInput={(e) => {
            e.currentTarget.validity.valid || (e.currentTarget.value = "");
          }}
          max={max}
          value={inputValue}
        />
        {icon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
      {inputError && <span className="text-sm text-red-500">{errorText}</span>}
    </label>
  );
}
