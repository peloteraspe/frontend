import React, { FC, useRef, useState } from "react";
import { useOutside } from "@/utils/hooks/useOutside";
import { InputProps } from "@/utils/interfaces";
import { calendar } from "@/utils/constants/icons";
import { Text } from "../atoms";
import { Calendar } from "../molecules/Calendar";
import { Icon } from "@/components/atoms/Icon";

interface InputDateProps extends InputProps {
  placeholderText?: string;
  setFormDate: (arg: Date) => void;
  formDate?: Date;
  disabled?: boolean;
}

export const InputDate: FC<InputDateProps> = ({
  required,
  error,
  labelText,
  placeholderText = "Starting On",
  errorText = "Error Text",
  disabled,
  formDate,
  setFormDate,
}) => {
  const wrapperRef = useRef(null);
  const [date, setDate] = useState(formDate);
  const [open, setOpen] = useState(false);
  const format = (inputDate: Date) => {
    let date, month, year;
    date = inputDate.getDate();
    month = inputDate.getMonth() + 1;
    year = inputDate.getFullYear();

    return `${year}-${month}-${date}`;
  };

  const onSelectDate = (selected: Date) => {
    setFormDate(selected);
    setDate(selected);
    setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  useOutside(wrapperRef, () => {
    setOpen(false);
  });

  const toggleCalendar = () => {
    setOpen(!open);
  };

  return (
    <div ref={wrapperRef} className="calendar-container w-full ">
      {labelText && (
        <div className="mb-1">
          <Text color="black">
            {labelText}
            {required && <Text color="black"> *</Text>}
          </Text>
        </div>
      )}
      <div className="relative">
        <input
          className={`${
            disabled
              ? `bg-white border-transparent bgInputDateDisabled`
              : ` cursor-pointer py-2 px-3  focus:outline-none focus:border-primary hover:border-primary  z-10 border  border-lightGray `
          } disabled:border-transparent bg-transparent transition duration-150 appearance-none rounded-xl  text-white leading-tight  hover:outline-none h-[38px] placeholder:text-lightGray w-full`}
          type="text"
          placeholder={placeholderText}
          defaultValue={date ? format(date) : ""}
          onClick={() => !disabled && toggleCalendar()}
          disabled={disabled}
          readOnly
        />
        <Icon
          paths={calendar}
          fill={"white"}
          style={{ fontWeight: "600" }}
          className={" absolute right-1.5 bottom-1 z-[-1]"}
        ></Icon>
      </div>

      <div
        className={`calendar ${
          open ? "expanded-calendar" : "collapsed-calendar"
        }`}
      >
        <Calendar
          date={date ? date : new Date()}
          getDateValue={(date) => {
            onSelectDate(date);
          }}
        ></Calendar>
      </div>
      {error && <Text color="red">{errorText}</Text>}
    </div>
    // <label ref={wrapperRef}>
    //   {labelText && (
    //     <div className="mb-1">
    //       <Text color="black">
    //         {labelText}
    //         {required && <Text color="black"> *</Text>}
    //       </Text>
    //     </div>
    //   )}
    //   <div
    //     className={`relative max-w-[272px] ${
    //       disabled ? "" : "cursor-pointer"
    //     } `}
    //   >
    //     <input
    //       className={`${
    //         disabled
    //           ? `bg-white border-transparent bgInputDateDisabled`
    //           : ` cursor-pointer inputDate py-2 px-3  focus:outline-none focus:border-primary hover:border-primary  z-10 border  border-lightGray `
    //       } disabled:border-transparent transition duration-150 appearance-none rounded-xl w-full  text-gray-700 leading-tight  hover:outline-none h-[38px] placeholder:text-lightGray `}
    //       type="text"
    //       placeholder={placeholderText}
    //       defaultValue={date ? format(date) : ""}
    //       onClick={() => !disabled && setOpen(true)}
    //       disabled={disabled}
    //       readOnly
    //     />
    //     <Icon
    //       paths={calendar}
    //       fill={"white"}
    //       style={{ fontWeight: "600" }}
    //       className={" absolute right-1.5 bottom-1"}
    //     ></Icon>
    //   </div>
    //   {open && (
    //     <Calendar
    //       date={date ? date : new Date()}
    //       getDateValue={(date) => {
    //         onSelectDate(date);
    //       }}
    //     ></Calendar>
    //   )}
    //   {error && <Text color="red">{errorText}</Text>}
    // </label>
  );
};
