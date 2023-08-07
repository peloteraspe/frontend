import React, { FC, useState } from "react";
import { SelectHour } from "../atoms/SelectHour";
import { optionHours } from "@/utils/constants/options";

// interface SelectHourProps {
//   placeholderText?: string;
//   error?: boolean;
//   errorText?: string;
//   setFormValue: (arg: string) => void;
//   formValue?: string;
//   options?: string[];
//   setOptions?: (arg: string[]) => void;
//   SelectedHour?: string;
//   readOnly?: boolean;
//   readOnlySelectHour?: boolean;
// }

const SelectHours: FC = () => {
  const [initialTime, setInitialTime] = useState<string>("");
  const [finalTime, setFinalTime] = useState<string>("");
  return (
    <div className="w-full flex justify-between">
      <SelectHour
        setFormValue={setInitialTime}
        options={optionHours}
        placeholderText="14:00"
      />
      <SelectHour
        setFormValue={setFinalTime}
        options={optionHours}
        placeholderText="16:00"
      />
    </div>
  );
};

export default SelectHours;
