import React from 'react';

export const Tag = ({ text, remove, handleTagSelection, selectedTags }) => {
  return (
    <span
      className={`mr-2 mb-2 px-2 py-1 cursor-pointer rounded ${
        selectedTags[text] ? 'bg-blue-600 text-white' : 'bg-gray-200'
      }`}
      onClick={() => handleTagSelection(text)}
    >
      {text}
    </span>
  );
};
