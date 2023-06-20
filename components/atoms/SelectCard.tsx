import React, { FC, useState } from "react";
import { SelectCardProps } from "../../utils/interfaces";
import { Text } from "./Text";
import { Icon } from "./Icon";
import { infoCircle } from "@/utils/constants/icons";

export const SelectCard: FC<SelectCardProps> = ({
  setOptionSelected,
  cardOptions,
  labelText,
}) => {
  const [optionSel, setOptionSel] = useState<number[]>([]);
  const isSelected = (index: number) => {
    if (optionSel?.find((number) => number === index)) {
      return true;
    } else {
      return false;
    }
  };
  return (
    <div className="flex justify-between mx-auto w-full items-center flex-col">
      {labelText && (
        <div className="mb-1 flex">
          <Text color="white">{labelText}</Text>
        </div>
      )}
      <div className="w-full flex flex-wrap mt-4 gap-5 justify-center items-center">
        {cardOptions.map((card, index) => (
          <div
            key={index}
            onClick={() => {
              const isOptionSelected = isSelected(index + 1);
              if (isOptionSelected) {
                const optionUpdate = optionSel.filter(
                  (optionIndex) => optionIndex !== index + 1
                );
                setOptionSelected(optionUpdate);
                setOptionSel((prev) =>
                  prev.filter((optionIndex) => optionIndex !== index + 1)
                );
              } else {
                const optionUpdate = [...optionSel, index + 1];
                setOptionSelected(optionUpdate);
                setOptionSel((prev) => [...prev, index + 1]);
              }
            }}
            className={`${
              isSelected(index + 1) && "shadow-[0_0_20px_#4CDB86]"
            } w-[150px] h-[170px] text-center rounded-lg p-6 flex justify-center items-center flex-col cursor-pointer border border-green`}
          >
            <Icon paths={infoCircle} fill="#4CDB86" width={21} height={21} viewBox="0 0 21 21"></Icon>
            <img
              className="mt-3"
              src={`/assets/positionOptions/${card.index}.png`}
            />
            <p
              className={`${
                isSelected(index + 1) ? "text-green" : "text-white"
              } text-sm font-bold mt-2`}
            >
              {card.title}
            </p>
          </div>
        ))}
        <div />
      </div>
    </div>
  );
};
