// CloudIcon.tsx
import React from "react";

interface CloudIconProps {
  color?: string; // Prop para el color del contorno (stroke)
}

const CloudIcon: React.FC<CloudIconProps> = ({ color = "white" }) => {
  const colorTrans = (color: string) => {
    switch (color) {
      case "btnBg-light":
        return "#54086F";
      case "btnBg-dark":
        return "#470B62";
      case "grayIcon":
        return "#ADB5BD";
      default:
        return color;
    }
  };

  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 18 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.5 9.50002C1.5 11.341 2.99238 12.8334 4.83333 12.8334H12.3333C14.6345 12.8334 16.5 10.9679 16.5 8.66669C16.5 6.3655 14.6345 4.50002 12.3333 4.50002C12.3055 4.50002 12.2778 4.50029 12.2501 4.50084C11.8644 2.59856 10.1828 1.16669 8.16667 1.16669C5.86548 1.16669 4 3.03217 4 5.33335C4 5.64739 4.03474 5.95331 4.10059 6.24748C2.61214 6.58136 1.5 7.91081 1.5 9.50002Z"
        stroke={colorTrans(color)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CloudIcon;
