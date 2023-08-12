import React from "react";
import { Text } from "./Text";
import { InputProps } from "@/utils/interfaces";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      required,
      error,
      labelText,
      placeholderText,
      errorText,
      setFormValue,
      disabled,
      type,
      min,
      max,
      isSearchable,
      name,
      onChange,
    },
    ref
  ) => {
    return (
      <label className="w-full">
        {labelText && (
          <div className="mb-1 flex">
            <Text variant="sm" color="white">
              {labelText}
            </Text>
            {required && (
              <Text variant="sm" color="white">
                {" "}
                *
              </Text>
            )}
          </div>
        )}
        <div style={{ width: "inherit" }} className="relative cursor-pointer">
          <input
            type={type}
            placeholder={placeholderText}
            min={min}
            max={max}
            disabled={disabled}
            autoComplete="new-password"
            className={`${
              disabled
                ? "bg-white"
                : "py-2 px-3 bg-transparent focus:outline-none focus:border-primary hover:border-primary h-[42px]"
            } disabled:border-transparent transition duration-150 appearance-none border border-lightGray rounded-xl w-full  text-white leading-tight  hover:outline-none placeholder:text-lightGray`}
            ref={ref}
            onChange={onChange}
            name={name}
          />
        </div>

        {error && (
          <Text variant="xs" color="red">
            {errorText}
          </Text>
        )}
      </label>
    );
  }
);

Input.displayName = "Input";
