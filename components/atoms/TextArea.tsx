import React, { FC } from "react";
import { Text } from "../atoms";
import { TextAreaProps } from "@/utils/interfaces";

export const TextArea: FC<TextAreaProps> = ({
  required,
  error,
  labelText,
  placeholderText = "Field Text",
  errorText = "Error Text",
  setFormValue,
  disabled,
  rows,
}) => {
  return (
    <label className="h-full">
      {labelText && (
        <div className="mb-1">
          <Text variant="sm" color="black">
            {labelText}
            {required && (
              <Text variant="sm" color="black">
                {" "}
                *
              </Text>
            )}
          </Text>
        </div>
      )}
      <div>
        <textarea
          className={`${
            disabled
              ? "bg-white resize-none"
              : "py-2 px-3 focus:shadow-[0_0_0_0.2rem_#D943A8] focus:outline-none focus:border-primary hover:border-primary"
          } disabled:border-transparent transition duration-150 appearance-none border border-lightGray rounded-xl w-full  text-gray-700 leading-tight  hover:outline-none`}
          placeholder={placeholderText}
          onChange={(e) => {
            setFormValue(e.target.value);
          }}
          disabled={disabled}
          rows={rows}
        />
      </div>

      {error && (
        <Text variant="xs" color="red">
          {errorText}
        </Text>
      )}
    </label>
  );
};
