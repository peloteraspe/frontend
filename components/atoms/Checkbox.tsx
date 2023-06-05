import React, { FC } from 'react';

export type ICheckboxDescription = {
  href?: string;
  description: string;
};

export type ICheckbox = {
  value: boolean;
  description: ICheckboxDescription[];
  name: string;
};
interface CheckboxProps {
  option: ICheckbox;
  setFormValue: (value: boolean) => void;
  value: boolean;
  index: string;
}

export const Checkbox: FC<CheckboxProps> = ({ option, setFormValue, value = false, index }) => {
  const handleCheckbox = (e: any) => {
    const { checked } = e.target;
    setFormValue(checked);
  };
  return (
    <>
      <fieldset className={'flex mb-3 justify-between'}>
        <div className={'flex items-center w-full'}>
          <div className='border-2 border-primary rounded-full w-fit h-fit flex justify-center items-center mr-1.5'>
            <input
              name={option.name}
              className='checked:bg-primary accent-white border-white border-[2.5px]'
              type='checkbox'
              id={index}
              onChange={(e) => {
                handleCheckbox(e);
              }}
              defaultChecked={value}
            />
          </div>
          <label htmlFor={index} className='text-alternative text-xs'>
            {option.description.map((desc, index) =>
              desc.href ? (
                <a target={'_blank'} href={desc.href} key={index} className='text-primary font-bold' rel='noreferrer'>
                  {' ' + desc.description}
                </a>
              ) : (
                <span key={index}>{desc.description}</span>
              ),
            )}
          </label>
        </div>
      </fieldset>
    </>
  );
};
