"use client";
import { useRouter } from "next/navigation";
import React from "react";

interface ButtonWrapperProps {
  color?: string;
  hovered?: string;
  width?: string | number;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: any;
  bg?: string;
  border?: string;
  children?: React.ReactNode;
  navigateTo?: string;
  iconDirection?: "left" | "right";
}

export const ButtonWrapper: React.FC<ButtonWrapperProps> = ({
  width,
  icon,
  disabled,
  onClick,
  children,
  navigateTo,
  iconDirection = "right",
}) => {
  const buttonWidth = width === "fit-content" ? "w-fit" : `w-full`;
  const buttonDisabled = disabled
    ? "cursor-not-allowed bg-gray-500"
    : "cursor-pointer bg-btnBg-light hover:bg-btnBg-dark hover:shadow";

  const router = useRouter();

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
    if (navigateTo) {
      router.push(navigateTo);
    }
  };

  return (
    <button
      className={`${buttonWidth} px-3 py-[0.75rem] font-semibold  text-white rounded-xl my-0 flex justify-center items-center relative box-border ${buttonDisabled} `}
      onClick={handleClick}
      disabled={disabled}
    >
      {icon && iconDirection === "left" && children && (
        <>
          <div className="mr-2">{icon}</div>
          {children}
        </>
      )}
      {icon && iconDirection === "right" && children && (
        <>
          {children}
          <div className="ml-2">{icon}</div>
        </>
      )}
      {!icon && children && <>{children}</>}
      {icon && !children && (
        <div style={{ minWidth: "min-content" }}>{icon}</div>
      )}
    </button>
  );
};

export const ButtonWrapperOutline: React.FC<ButtonWrapperProps> = ({
  bg = "bg-transparent",
  width = "fit-content",
  icon,
  disabled,
  onClick,
  children,
}) => {
  const buttonWidth = width === "fit-content" ? "w-fit" : `w-${width}`;

  return (
    <button
      className={`${buttonWidth} px-3 py-[0.75rem] ${bg} font-semibold text-btnBg-light border-2 border-btnBg-light hover:border-btnBg-dark hover:text-btnBg-dark rounded-xl my-0 mx-2 flex justify-center items-center relative box-border ${
        disabled ? "cursor-auto" : "cursor-pointer"
      } `}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && !children && (
        <div style={{ minWidth: "min-content" }}>{icon}</div>
      )}
      {icon && children && <div className="mr-2">{icon}</div>}
      {children}
    </button>
  );
};

export const ButtonUnWrapperOutline: React.FC<ButtonWrapperProps> = ({
  bg = "bg-transparent",
  width = "fit-content",
  icon,
  disabled,
  onClick,
  children,
}) => {
  const buttonWidth = width === "fit-content" ? "w-fit" : `w-${width}`;

  return (
    <button
      className={`${buttonWidth}  px-3 py-[0.75rem] ${bg} font-semibold text-btnBg-light hover:bg-btnBg-trans hover:text-btnBg-dark rounded-xl my-0 flex justify-center items-center relative box-border ${
        disabled ? "cursor-auto" : "cursor-pointer"
      } `}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && !children && (
        <div style={{ minWidth: "min-content" }}>{icon}</div>
      )}
      {icon && children && <div className="mr-2">{icon}</div>}
      {children}
    </button>
  );
};

export const ButtonHover: React.FC<ButtonWrapperProps> = ({
  color,
  bg = "bg-transparent",
  width = "fit-content",
  icon,
  disabled,
  onClick,
  children,
}) => {
  const buttonWidth = width === "fit-content" ? "w-fit" : `w-${width}`;

  return (
    <button
      className={`${buttonWidth} px-3 py-[0.75rem] ${bg} font-semibold text-${color} hover:border-2 hover:border-${color} rounded-xl my-0 mx-2 flex justify-center items-center relative box-border ${
        disabled ? "cursor-auto" : "cursor-pointer"
      } `}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && children && (
        <div className="mr-2">
          {icon} {children}
        </div>
      )}

      {icon && !children && (
        <div style={{ minWidth: "min-content" }}>{icon}</div>
      )}
    </button>
  );
};
