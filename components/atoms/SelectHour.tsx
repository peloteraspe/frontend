import React, { FC, useEffect, useRef, useState } from "react";
import { Icon, Text } from "../atoms";
import { chevronDown } from "@/utils/constants/icons";

interface SelectHourProps {
  placeholderText?: string;
  error?: boolean;
  errorText?: string;
  setFormValue: (arg: string) => void;
  formValue?: string;
  options?: string[];
  setOptions?: (arg: string[]) => void;
  SelectedHour?: string;
  readOnly?: boolean;
  readOnlySelectHour?: boolean;
  labelText?: string;
}
const timeOptions = Array.from({ length: 24 * 2 }).map((_, idx) => {
  const hours = Math.floor(idx / 2);
  const minutes = (idx % 2) * 30;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
});

export const SelectHour: FC<SelectHourProps> = ({
  placeholderText,
  setFormValue,
  formValue,
  options,
  setOptions,
  readOnly,
  readOnlySelectHour,
  error,
  errorText,
  labelText,
}) => {
  const [open, setOpen] = useState(false);
  const [SelectedHour, setSelectedHour] = useState(formValue || "");
  const [hourError, setHourError] = useState<string | null>(null);

  const [filteredOptions, setFilteredOptions] = useState(options);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidTime = (time: string): boolean => {
    const [hours, minutes] = time.split(":");
    return hours >= "00" && hours <= "23" && minutes >= "00" && minutes <= "59";
  };

  useEffect(() => {
    const formattedHour = formatInputValue(SelectedHour);

    if (formattedHour) {
      const filterOptions = timeOptions.filter((option) =>
        option.startsWith(formattedHour.padEnd(5, "_"))
      );
      setFilteredOptions(filterOptions);
    } else if (showDropdown && !formattedHour) {
      setFilteredOptions(timeOptions);
    }
  }, [SelectedHour, showDropdown]);

  const formatInputValue = (value: string): string => {
    const formattedValue = value.replace(/[^0-9]/g, "");
    if (formattedValue.length >= 3) {
      return `${formattedValue.slice(0, 2)}:${formattedValue.slice(2, 4)}`;
    } else if (formattedValue.length > 0) {
      return `${formattedValue}`;
    }
    return "";
  };
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value.replace(/[^0-9]/g, "");
    if (newValue.length <= 4) {
      setSelectedHour(newValue);
      setFormValue(newValue);
      if (newValue.length === 4 && !isValidTime(formatInputValue(newValue))) {
        setHourError("Seleccione una hora válida");
      } else {
        setHourError(null);
      }
    }
  };

  const onClickSelectHour = (e: React.MouseEvent<HTMLDivElement>) => {
    options === undefined || error ? setOpen(false) : setOpen(true);
    setSelectedHour(""); // Reset SelectedHour
    e.stopPropagation();
  };
  return (
    <div className="w-[45%]">
      {labelText && (
        <div className="mb-1 flex">
          <Text variant="sm" color="white">
            {labelText}
          </Text>
        </div>
      )}
      <div className="relative">
        <input
          onClick={(e) => onClickSelectHour(e)}
          readOnly={readOnlySelectHour}
          placeholder={placeholderText}
          ref={inputRef}
          value={formatInputValue(SelectedHour)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onChange={handleInputChange}
          maxLength={5} // HH:MM format
          className={`${"border-lightGray focus:outline-none focus:border-primary hover:border-primary hover:outline-none py-2 px-3 "} cursor-pointer placeholder:text-lightGray transition duration-150 appearance-none border  rounded-xl w-full  text-white bg-transparent`}
        />
        <div
          className="absolute bottom-0 right-0 pr-3 mb-2 font-semibold cursor-pointer"
          onClick={(e) => onClickSelectHour(e)}
        >
          <Icon
            paths={chevronDown}
            stroke="#4CDB86"
            width={24}
            height={24}
            viewBox="0 0 20 20"
          ></Icon>
        </div>
        {showDropdown && filteredOptions.length > 0 && (
          <div
            className={`${
              filteredOptions.length === 1 ? "h-auto" : "h-[217px]"
            }  absolute right-0 mt-2 py-2 w-full bg-white rounded-lg shadow-xl z-50 cursor-pointer overflow-x-scroll `}
          >
            {filteredOptions.map((option, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedHour(option);
                  setFormValue(option);
                  setShowDropdown(false);
                  setHourError(null);
                  inputRef.current?.focus();
                }}
                className={`h-[40px] text-ellipsis overflow-hidden block px-4 py-2 text-gray-800 hover:bg-primary hover:text-white ${
                  SelectedHour === option ?? "bg-primary"
                } `}
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </div>
      {(error || hourError) && (
        <Text variant="xs" color="red">
          {hourError || errorText}
        </Text>
      )}{" "}
    </div>
  );
};
