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
}

export const ButtonWrapper: React.FC<ButtonWrapperProps> = ({
  width = "fit-content",
  icon,
  disabled,
  onClick,
  children,
}) => {
  const buttonWidth = width === "fit-content" ? "w-fit" : `w-${width}`;

  return (
    <button
      className={`${buttonWidth} px-3 py-[0.75rem] font-semibold bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-md my-0 flex justify-center items-center relative box-border ${
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
      className={`${buttonWidth} px-3 py-[0.75rem] ${bg} font-semibold text-btnBg-light border-2 border-btnBg-light hover:border-btnBg-dark hover:text-btnBg-dark rounded-md my-0 mx-2 flex justify-center items-center relative box-border ${
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
        className={`${buttonWidth} px-3 py-[0.75rem] ${bg} font-semibold text-btnBg-light hover:bg-btnBg-trans hover:text-btnBg-dark rounded-md my-0 flex justify-center items-center relative box-border ${
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
        className={`${buttonWidth} px-3 py-[0.75rem] ${bg} font-semibold text-${color} hover:border-2 hover:border-${color} rounded-md my-0 mx-2 flex justify-center items-center relative box-border ${
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
  

