import React, { FC, useRef } from "react";
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
  const [open, setOpen] = React.useState(false);
  const [SelectedHour, setSelectedHour] = React.useState(formValue || "");
  const [hourError, setHourError] = React.useState<string | null>(null);

  // Ref for the container
  const containerRef = useRef(null);
  // Refs for each option
  const optionRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement> }>(
    {}
  );

  React.useEffect(() => {
    if (options) {
      options.forEach((option) => {
        optionRefs.current[option] = React.createRef();
      });
    }
  }, [options]);

  // const formatHour = (value: string) => {
  //   const digits = value.replace(/[^0-9]/g, ""); // keep only numbers
  //   // if (digits.length === 0) return "";
  //   if (digits.length <= 2) {
  //     return digits; // Return just the hours (or part of it) without ':'
  //   }
  //   let hours = parseInt(digits.slice(0, 2), 10);
  //   let minutes = parseInt(digits.slice(2, 4), 10);

  //   if (hours > 23) {
  //     setHourError(errorText || "Invalid hour format");
  //     return value;
  //   } else if (minutes > 59) {
  //     setHourError(errorText || "Invalid minute format");
  //     return String(hours).padStart(2, "0") + ":" + digits.slice(2);
  //   }

  //   setHourError(null); // Resetting error if the time is valid
  //   return (
  //     String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0")
  //   );
  // };

  // const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.value === "") {
  //     setSelectedHour("");
  //     setFormValue("");
  //     setHourError(null); // Resetting error if the input is cleared
  //   } else {
  //     let formattedValue = formatHour(e.target.value);
  //     setSelectedHour(formattedValue);
  //     setFormValue(formattedValue);
  //   }
  // };

  const handleHourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    if (/^([01]?[0-9]|2[0-3]):?[0-5]?[0-9]?$/.test(newValue)) {
      setFormValue(newValue);
      setSelectedHour(newValue);
    } else {
      setHourError(errorText || "Invalid hour format");
    }
  };

  const onSelectHourOption = (SelectedHour: string) => {
    setFormValue(SelectedHour);
    setSelectedHour(SelectedHour);
    setOpen(false);
  };

  const onBlurSelectHour = () => {
    setTimeout(() => {
      setOpen(false);
    }, 200);
  };
  // After we set the dropdown to be open, then we'll trigger the scroll behavior
  const onClickSelectHour = (e: React.MouseEvent<HTMLDivElement>) => {
    options === undefined || error ? setOpen(false) : setOpen(true);
    // e.stopPropagation();
  };

  // Using useEffect to scroll when dropdown is opened
  React.useEffect(() => {
    if (open) {
      scrollToSelector();
    }
  }, [open, SelectedHour]);

  const scrollToSelector = () => {
    if (options && SelectedHour) {
      // Find the first option that starts with the input
      const matchingOption = options.find((option) =>
        option.startsWith(SelectedHour)
      );

      if (matchingOption && optionRefs.current[matchingOption]?.current) {
        containerRef.current.scrollTo({
          top: optionRefs.current[matchingOption].current.offsetTop,
          behavior: "smooth",
        });
      }
    }
  };

  const formatInputValue = (value: string): string => {
    // Remove any non-digit characters
    const digits = value.replace(/[^0-9]/g, "");
    // Check for single-digit hour
    if (digits.length === 0) return "12:00";

    if (digits.length === 1) {
      if (["0", "1", "2"].includes(digits)) {
        return `${digits}0:00`;
      }
      return `0${digits}:00`;
    }

    // Check for two-digit hour
    if (digits.length === 2) {
      if (parseInt(digits, 10) > 23) {
        return `0${digits[0]}:00`;
      }
      return `${digits}:00`;
    }

    // For longer values, format hour and minute accordingly
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }

    return value;
  };

  return (
    <div className="w-[45%]">
      <div onBlur={onBlurSelectHour} className="relative">
        <input
          onClick={(e) => onClickSelectHour(e)}
          readOnly={readOnlySelectHour}
          // readOnlySelectHour={readOnlySelectHour}
          value={formatInputValue(SelectedHour)}
          placeholder={placeholderText}
          onChange={handleHourChange}
          maxLength={5} // HH:MM format
          className={`${"border-lightGray focus:outline-none focus:border-primary hover:border-primary hover:outline-none py-2 px-3 "} cursor-pointer placeholder:text-lightGray transition duration-150 appearance-none border  rounded-xl w-full  text-white bg-transparent`}
        />
        <div
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
        )}
      </div>
      {(error || hourError) && (
        <Text color="red">{hourError || errorText}</Text>
      )}{" "}
    </div>
  );
};
