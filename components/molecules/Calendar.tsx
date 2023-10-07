import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { Text } from "../atoms";

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
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
  completeDay?: string;
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
      <div
        className="flex cursor-pointer w-[20px] h-[20px]"
        onClick={decreaseMonth}
      >
        {"<"}
      </div>
      <Text variant="sm">
        {month} {year}
      </Text>
      <div
        className="flex cursor-pointer w-[20px] h-[20px]"
        onClick={increaseMonth}
      >
        {" >"}
      </div>
    </div>
  );
};

const getDaySpanish = (day: string) => {
  const newDay = (() => {
    switch (day) {
      case "Sunday":
        return "D";
      case "Monday":
        return "L";
      case "Tuesday":
        return "M";
      case "Wednesday":
        return "M";
      case "Thursday":
        return "J";
      case "Friday":
        return "V";
      case "Saturday":
        return "S";
      default:
        return day;
    }
  })();
  return newDay;
};
const CustomDayOfWeek = ({
  day,
  dayColor,
  completeDay,
}: CustomDayOfWeekProps) => (
  <Text variant="xs">{getDaySpanish(completeDay)}</Text>
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
          <CustomDayOfWeek
            completeDay={day}
            day={day.substr(0, 1)}
            dayColor={dayColor}
          />
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
