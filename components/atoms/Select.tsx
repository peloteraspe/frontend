import React, { FC } from "react";
import { Text } from "../atoms";

interface SelectProps {
  placeholderText?: string;
  error?: boolean;
  errorText?: string;
  errorTextSearchable?: string;
  setFormValue: (arg: string) => void;
  formValue?: string;
  options?: string[];
  setOptions?: (arg: string[]) => void;
  optionsToken?: TokenOption[];
  selectToken?: boolean;
  selected?: string;
  isSearchable?: boolean;
  isVerified?: string; // "IOTA" | "Shimmer"
  readOnly?: boolean;
  readOnlySelect?: boolean;
}

export interface TokenOption {
  key: string;
  value: string;
}

export const Select: FC<SelectProps> = ({
  placeholderText,
  setFormValue,
  formValue,
  options,
  setOptions,
  optionsToken,
  selectToken,
  isSearchable,
  isVerified,
  readOnly,
  readOnlySelect,
  error,
  errorText,
  errorTextSearchable,
}) => {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(formValue);
  const [tokenOption, _setTokenOption] = React.useState<TokenOption[]>(
    optionsToken || []
  );

  const onSelectOption = (selected: string) => {
    setFormValue(selected);
    setSelected(selected);
    setOpen(false);
  };

  const onBlurSelect = () => {
    setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  return (
    <div className={`${isSearchable ? "h-[56px] mb-[-14px]" : ""}`}>
      <div onBlur={onBlurSelect} className="relative">
        <input
          onClick={() =>
            options === undefined || error ? setOpen(false) : setOpen(!open)
          }
          readOnly={readOnlySelect}
          // readOnlySelect={readOnlySelect}
          value={selected}
          placeholder={placeholderText}
          onChange={(e) => {
            setFormValue(e.target.value);
            if (isSearchable) {
              setOpen(true);
            }
            setSelected(e.target.value);
          }}
          className={`${
            selectToken
              ? "border-transparent focus:outline-none focus:border-transparent hover:border-transparent placeholder:text-lightGray py-1 px-2"
              : "border-lightGray focus:outline-none focus:border-primary hover:border-primary hover:outline-none py-2 px-3 "
          } cursor-pointer placeholder:text-lightGray transition duration-150 appearance-none border  rounded-xl w-full  text-gray-700`}
        />

        {open && !error && selected !== "" && (
          <div className="absolute right-0 mt-2 py-2 w-full bg-white rounded-lg shadow-xl z-50 cursor-pointer">
            {options &&
              options?.map((option, index) => (
                <div
                  key={index}
                  onClick={() =>
                    options === undefined ? "" : onSelectOption(option)
                  }
                  className={`text-ellipsis overflow-hidden block px-4 py-2 text-gray-800 hover:bg-primary hover:text-white ${
                    selected === option ?? "bg-primary"
                  } `}
                >
                  {option}
                </div>
              ))}

            {isVerified &&
              tokenOption &&
              tokenOption.map((option, index) => (
                <div
                  key={index}
                  onClick={() => onSelectOption(option.key)}
                  className={`block px-4 py-2 text-gray-800 hover:bg-primary hover:text-white ${
                    selected === option.key ?? "bg-primary"
                  } `}
                >
                  {option.key}
                </div>
              ))}
          </div>
        )}
      </div>
      {error && (
        <Text variant="sm" color="red">
          {isSearchable ? errorTextSearchable : errorText}
        </Text>
      )}
    </div>
  );
};
