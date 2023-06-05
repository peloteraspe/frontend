import React, { FC } from 'react';
import { Icon } from './Icon';
import { Text } from './Text';

interface TagProps {
  text: string;
  remove: () => void;
  subText?: string;
  icon?: { fill: string; paths: string[] };
}

export const Tag: FC<TagProps> = ({ text, remove, subText, icon }) => {
  return (
    <div className='relative'>
      <div
        className='absolute -top-2 -right-1 bg-primary rounded-full w-3 h-3 text-white flex justify-center items-center text-xs cursor-pointer max-w-[12px] min-w-[12px]'
        onClick={remove}>
        <span className='text-[7px] font-bold manrope'>X</span>
      </div>
      {icon ? (
        <a href={text} target='_blank' rel='noopener noreferrer'>
          <Icon fill={icon.fill} paths={icon.paths} />
        </a>
      ) : (
        <div className='rounded-lg px-2 py-1 bg-inactive text-center'>
          <Text color='primary'>
            {text}
          </Text>
          {subText && (
            <Text color='electricPink'>
              {subText}
            </Text>
          )}
        </div>
      )}
    </div>
  );
};
