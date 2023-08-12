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
}) => {
  const [open, setOpen] = useState(false);
  const [SelectedHour, setSelectedHour] = useState(formValue || "");
  const [hourError, setHourError] = useState<string | null>(null);

  const [filteredOptions, setFilteredOptions] = useState(options);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (SelectedHour) {
      const filterOptions = timeOptions.filter((option) =>
        option.startsWith(SelectedHour.padEnd(5, "_"))
      );
      setFilteredOptions(filterOptions);
    } else if (showDropdown && !SelectedHour) {
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
    }
  };

  const onClickSelectHour = (e: React.MouseEvent<HTMLDivElement>) => {
    options === undefined || error ? setOpen(false) : setOpen(true);
    setSelectedHour(""); // Reset SelectedHour
    e.stopPropagation();
  };
  return (
    <div className="w-[45%]">
      {/* <div onBlur={onBlurSelectHour} className="relative"> */}
      <div className="relative">
        <input
          onClick={(e) => onClickSelectHour(e)}
          readOnly={readOnlySelectHour}
          // readOnlySelectHour={readOnlySelectHour}
          // value={formatSelectedHour(SelectedHour)}
          placeholder={placeholderText}
          // onChange={handleHourChange}
          ref={inputRef}
          value={formatInputValue(SelectedHour)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onChange={handleInputChange}
          // placeholder="HH:MM"
          maxLength={5} // HH:MM format
          className={`${"border-lightGray focus:outline-none focus:border-primary hover:border-primary hover:outline-none py-2 px-3 "} cursor-pointer placeholder:text-lightGray transition duration-150 appearance-none border  rounded-xl w-full  text-white bg-transparent`}
        />
        {showDropdown && filteredOptions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              maxHeight: "100px",
              overflowY: "auto",
              border: "1px solid #ccc",
            }}
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
                style={{
                  padding: "5px",
                  cursor: "pointer",
                  backgroundColor:
                    option === SelectedHour ? "#eee" : "transparent",
                }}
              >
                {option}
              </div>
            ))}
          </div>
        )}
        {/* <div
          style={{
            paddingRight: "12px",
            fontWeight: "600",
            cursor: "pointer",
            position: "absolute",
            bottom: "0",
            right: "0",
            marginBottom: "8px",
          }}
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

        {open && !error && SelectedHour !== "" && (
          <div className="h-[217px] absolute right-0 mt-2 py-2 w-full bg-white rounded-lg shadow-xl z-50 cursor-pointer overflow-x-scroll ">
            {options &&
              options?.map((option, index) => (
                <div
                  key={index}
                  onClick={() =>
                    options === undefined ? "" : onSelectHourOption(option)
                  }
                  className={`h-[40px] text-ellipsis overflow-hidden block px-4 py-2 text-gray-800 hover:bg-primary hover:text-white ${
                    SelectedHour === option ?? "bg-primary"
                  } `}
                >
                  {option}
                </div>
              ))}
          </div>
        )} */}
      </div>
      {(error || hourError) && (
        <Text color="red">{hourError || errorText}</Text>
      )}{" "}
    </div>
  );
};
