"use client";
import React, { useState, FC } from "react";

interface CollapseProps {
  title: string;
  content: string;
  width?: string;
}

const Collapse: FC<CollapseProps> = ({ title, content, width }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCollapse = () => {
    setIsOpen(!isOpen);
  };
  const collapseWidth = width === "fit-content" ? "w-fit" : `w-full`;

  return (
    <div className={`${collapseWidth} mt-5`}>
      <div
        className="bg-[#744D7C] bg-opacity-5 text-[#54086F] font-bold text-lg px-4 py-2 cursor-pointer rounded-[12px] flex justify-between items-center"
        onClick={toggleCollapse}
        style={{ height: "66px" }} // Fixed height regardless of collapse state
      >
        {title}
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div
        className={`transition-[max-height] duration-700 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[2000px]" : "max-h-0"
        }`}
        style={{ borderRadius: isOpen ? "0 0 12px 12px" : "0" }}
      >
        <div className="bg-[#CFC1D2] bg-opacity-5 text-black p-4 rounded-b-lg">
          {content}
        </div>
      </div>
    </div>
  );
};

export default Collapse;
