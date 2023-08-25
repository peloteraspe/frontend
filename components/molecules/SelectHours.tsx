import React, { FC, useEffect, useState } from "react";
import { SelectHour } from "../atoms/SelectHour";
import { optionHours } from "@/utils/constants/options";

export interface TimeProps {
  initialTime: string;
  finalTime: string;
}
interface SelectHoursProps {
  setFormValue: (arg: TimeProps) => void;
  formValue?: TimeProps;
}

const SelectHours: FC<SelectHoursProps> = ({ setFormValue }) => {
  const [time, setTime] = useState<TimeProps>({
    initialTime: "",
    finalTime: "",
  });
  const [initialTime, setInitialTime] = useState<string>("");
  const [finalTime, setFinalTime] = useState<string>("");
  useEffect(() => {
    if (setFormValue) {
      setTime({ initialTime, finalTime });
      setFormValue({ initialTime, finalTime });
    }
  }, [initialTime, finalTime]);
  return (
    <div className="w-full flex justify-between">
      <SelectHour
        setFormValue={setInitialTime}
        options={optionHours}
        placeholderText="14:00"
        labelText="Hora de inicio"
      />
      <SelectHour
        setFormValue={setFinalTime}
        options={optionHours}
        placeholderText="16:00"
        labelText="Hora de finalización"
      />
    </div>
  );
};

export default SelectHours;
