'use client';

import React, { FC, ReactNode, useState } from 'react';

interface CollapseProps {
  title: string;
  content: ReactNode;
  width?: 'fit-content' | 'full';
  defaultOpen?: boolean;
}

const Collapse: FC<CollapseProps> = ({ title, content, width = 'full', defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const collapseWidth = width === 'fit-content' ? 'w-fit' : 'w-full';

  return (
    <div className={collapseWidth}>
      <button
        type="button"
        className="flex min-h-[58px] w-full items-center justify-between rounded-xl border border-[#54086F]/15 bg-[#744D7C]/[0.06] px-4 py-3 text-left text-base font-semibold text-[#54086F]"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <svg
          className={['h-4 w-4 transition-transform duration-200', isOpen ? 'rotate-180' : ''].join(' ')}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div
        className={[
          'overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
          isOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
      >
        <div className="rounded-b-xl border border-t-0 border-[#54086F]/15 bg-[#744D7C]/[0.03] px-4 py-3 text-sm text-slate-700">
          {content}
        </div>
      </div>
    </div>
  );
};

export default Collapse;
