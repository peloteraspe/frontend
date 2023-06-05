import React, { FC } from 'react';
import Image from 'next/image';
import { Input, Select } from '../atoms';

interface AddTagProps {
  onClick: () => void;
  placeholderText: string;
  setFormValue: (value: string) => void;
  selectPlaceholder?: string;
  selectSetFormValue?: (value: string) => void;
  selectOptions?: string[];
}

export const AddTag: FC<AddTagProps> = (input) => {
  return (
    <div className='flex gap-4'>
      <div className='flex flex-col gap-2'>
        <Input placeholderText={input.placeholderText} setFormValue={input.setFormValue} />
        {input.selectPlaceholder && input.selectSetFormValue && input.selectOptions && (
          <Select
            placeholderText={input.selectPlaceholder}
            setFormValue={input.selectSetFormValue}
            options={input.selectOptions}
          />
        )}
      </div>

      <Image
        className='cursor-pointer'
        src='/images/svgs/add_circle_outline.svg'
        onClick={input.onClick}
        width={30}
        height={30}
        alt='add'
      />
    </div>
  );
};
