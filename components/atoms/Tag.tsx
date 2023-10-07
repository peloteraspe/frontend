import React from 'react';

export const Tag = ({
  text,
  remove,
  handleTagSelection,
  selectedTags,
  icon,
}) => {
  return (
    <span
      className={`px-4 py-2 cursor-pointer rounded-full flex gap-2 ${
        selectedTags[text] ? 'bg-primary text-white' : 'border-2 border-primary'
      }`}
      onClick={() => handleTagSelection(text)}
    >
      {text} {icon && <img src={icon} className="" />}
    </span>
  );
};
