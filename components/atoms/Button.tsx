export type Colors =
  | "primary"
  | "secondary"
  | "purple"
  | "dark"
  | "success"
  | "warning"
  | "green"
  | "fuchsia"
  | "red";

import { FC, ReactNode, MouseEvent } from "react";
import { Spinner } from "./Spinner";
interface ButtonProps {
  text?: string;
  color?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  outline?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
}

export const Button: FC<ButtonProps> = ({
  text,
  color,
  onClick,
  disabled,
  outline,
  icon,
  children,
  loading,
}) => {
  const getColor = () => {
    if (disabled) {
      return "bg-disabled text-white";
    } else {
      switch (color) {
        case "primary":
          return "bg-purple border-2 border-primary hover:!border-primary-light text-white hover:bg-primary-light";
        case "secondary":
          return "bg-secondary border-2 border-secondary hover:border-secondary-light hover:bg-secondary-light text-white";
        case "purple":
          return "bg-purple text-white border-2 hover:border-purple-light hover:!bg-purple-light border-purple";
        case "green":
          return "bg-green border-2 text-white hover:bg-green-light border-green hover:border-green-light";
        case "red":
          return "bg-red border-2 text-white hover:bg-redHover border-red hover:border-redHover";
        case "fuchsia":
          return "bg-fuchsia border-2 text-white border-fuchsia hover:bg-fuchsia-light hover:border-fuchsia-light";
        default:
          return "bg-primary border-2 text-white border-primary hover:bg-primary-light hover:border-primary-light";
      }
    }
  };

  const getOutline = () => {
    switch (color) {
      case "primary":
        return "border-primary border-2 text-primary";
      case "secondary":
        return "border-secondary border-2 text-secondary";
      case "purple":
        return "border-purple border-2 text-purple";
      case "green":
        return "border-green border-2 text-green";
      case "fuchsia":
        return "border-fuchsia border-2 text-fuchsia";
      default:
        return "border-primary border-2 text-primary";
    }
  };

  return (
    <button
      className={`z-[-1] transition duration-150 py-[8px] text-sm w-full h-full flex items-center justify-center font-bold rounded-md focus:outline-none appearance-none ${
        outline ? getOutline() : getColor()
      } ${disabled ? "border-0 cursor-not-allowed" : ""}`}
      onClick={onClick}
      disabled={loading ? true : disabled}
    >
      {loading && (
        <Spinner
          width="15px"
          height="15px"
          stroke={color === "primary" ? "white" : "black"}
        />
      )}
      {icon && <span className="mr-2">{icon}</span>}
      {text || children}
    </button>
  );
};
