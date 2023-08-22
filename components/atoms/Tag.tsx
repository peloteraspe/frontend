import React from 'react';

export const Tag = ({ text, remove }) => {
  return (
    <div className="flex items-center bg-blue-500 text-white px-2 py-1 rounded">
      <span className="mr-2">{text}</span>
      <button onClick={remove} className="text-sm">
        X
      </button>
    </div>
  );
};
