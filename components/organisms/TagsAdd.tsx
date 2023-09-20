import React, { useState } from 'react';
import { Tag } from '../atoms';

export const Tags = ({
  tags,
  remove,
  setTags,
  selectedTags,
  handleTagSelection,
}) => {
  const [otro, setOtro] = useState('');
  return (
    <div>
      {tags.map((tag, index) => (
        <Tag
          key={index}
          text={tag}
          remove={() => remove(index)}
          handleTagSelection={handleTagSelection}
          selectedTags={selectedTags}
        />
      ))}
      <div>
        <label>Otro:</label>
        <input onChange={(e) => setOtro(e.target.value)} />
        <button
          onClick={(e) => {
            e.preventDefault();
            setTags([...tags, otro]);
            setOtro('');
          }}
        >
          Añadir
        </button>
      </div>
    </div>
  );
};
