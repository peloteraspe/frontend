import React, { FC } from "react";
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
  const [SelectedHour, setSelectedHour] = React.useState(formValue);
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
  const onClickSelectHour = (e) => {
    options === undefined || error ? setOpen(false) : setOpen(!open);
    e.stopPropagation();
  };

  return (
    <div className="w-[45%]">
      <div onBlur={onBlurSelectHour} className="relative">
        <input
          onClick={(e) => onClickSelectHour(e)}
          readOnly={readOnlySelectHour}
          // readOnlySelectHour={readOnlySelectHour}
          value={SelectedHour}
          placeholder={placeholderText}
          onChange={(e) => {
            setFormValue(e.target.value);
            setSelectedHour(e.target.value);
          }}
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
      {error && <Text color="red">{errorText}</Text>}
    </div>
  );
};
