import CloudIcon from "@/app/assets/CloudIcon";
import React from "react";

interface BadgeProps {
  badgeType: "Primary" | "Secondary" | "Third";
  text: string;
  icon: boolean;
}

const Badge = ({ badgeType, text, icon }: BadgeProps) => {
  const baseStyle =
    "text-btnBg-light px-3 py-1 rounded-xl h-7 text-center leading-5 font-poppins text-sm font-medium";
  const iconStyle = "flex justify-center items-center gap-2";
  const cloudColor =
    badgeType === "Primary"
      ? "btnBg-light"
      : badgeType === "Secondary"
      ? "btnBg-light"
      : "white";

  const style = [
    baseStyle,
    badgeType === "Primary"
      ? "bg-[#744D7C] bg-opacity-40 "
      : badgeType === "Secondary"
      ? "bg-white border-2 border-btnBg-light !leading-4"
      : "bg-btnBg-light text-white",
    icon ? "w-full" : "w-auto",
    icon ? iconStyle : "",
  ].join(" ");

  return (
    <div>
      {icon ? (
        <>
          <div className={`${style}`}>
            {icon && <CloudIcon color={cloudColor} />}
            {text}
          </div>
        </>
      ) : (
        <div className={`${style}`}>{text}</div>
      )}
    </div>
  );
};

export default Badge;
