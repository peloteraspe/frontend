import React from 'react';

export const Stepper = ({
  step,
  setCurrentStep,
}: {
  step: number;
  setCurrentStep: any;
}) => {
  return (
    <div className="px-4 pb-8">
      <div className="max-w-md mx-auto w-full">
        <div className="relative">
          <div
            className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-slate-200 "
            aria-hidden="true"
          ></div>
          <ul className="relative flex justify-between w-full">
            <li>
              <span
                onClick={() => setCurrentStep(1)}
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                  step >= 1
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100  text-slate-500 '
                }`}
              >
                1
              </span>
            </li>
            <li>
              <span
                onClick={() => setCurrentStep(2)}
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                  step >= 2
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100  text-slate-500 '
                }`}
              >
                2
              </span>
            </li>
            <li>
              <span
                onClick={() => setCurrentStep(3)}
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                  step >= 3
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100  text-slate-500 '
                }`}
              >
                3
              </span>
            </li>
            <li>
              <span
                onClick={() => setCurrentStep(4)}
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                  step >= 4
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100  text-slate-500 '
                }`}
              >
                4
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
