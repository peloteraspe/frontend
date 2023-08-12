import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { Text } from "../atoms";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface PickerProps {
  date: Date | null;
  dayColor?: string;
  getDateValue: (date: Date) => void;
  minDate?: Date;
}

interface CustomHeaderProps {
  month: string;
  year: number;
  decreaseMonth: () => void;
  increaseMonth: () => void;
}

interface CustomDayOfWeekProps {
  day: string;
  dayColor?: string;
}

interface CustomDayProps {
  day: number;
}

const CustomHeader = ({
  month,
  year,
  decreaseMonth,
  increaseMonth,
}: CustomHeaderProps) => {
  return (
    <div className=" flex justify-between items-center mb-1">
      <div className="flex" onClick={decreaseMonth}>
        {"<"}
      </div>
      <Text variant="sm">
        {month} {year}
      </Text>
      <div className="flex" onClick={increaseMonth}>
        {" >"}
      </div>
    </div>
  );
};

const CustomDayOfWeek = ({ day, dayColor }: CustomDayOfWeekProps) => (
  <Text variant="xs">{day}</Text>
);

const CustomDay = ({ day }: CustomDayProps) => (
  <div className="flex justify-center items-center w-[36px] h-[36px]">
    <Text variant="xs">{day}</Text>
  </div>
);

export type Ref = HTMLDivElement;

export const Calendar = ({
  date,
  dayColor,
  getDateValue,
  minDate,
}: PickerProps) => {
  const [selectedDate, setSelectedDate] = useState(date);

  const setDate = (dateData: any) => {
    setSelectedDate(dateData);
    getDateValue(dateData);
  };

  return (
    <div className="pickerWrapper">
      <DatePicker
        selected={selectedDate}
        shouldCloseOnSelect={true}
        minDate={minDate || new Date()}
        inline
        renderDayContents={(day) => <CustomDay day={day} />}
        formatWeekDay={(day) => (
          <CustomDayOfWeek day={day.substr(0, 1)} dayColor={dayColor} />
        )}
        renderCustomHeader={({ date, increaseMonth, decreaseMonth }) => {
          const customDate = date;
          const month = months[customDate.getMonth()];
          const year = customDate.getFullYear();
          return (
            <CustomHeader
              month={month}
              year={year}
              increaseMonth={increaseMonth}
              decreaseMonth={decreaseMonth}
            />
          );
        }}
        onChange={(dateData: Date | null) => setDate(dateData)}
      ></DatePicker>
    </div>
  );
};
