import React, { useEffect, useState } from 'react';
import { Button, Input, Tag } from '../atoms';

export const Tags = ({
  tags,
  remove,
  setTags,
  selectedTags,
  handleTagSelection,
  initialTags,
  labelTags,
}) => {
  const [otro, setOtro] = useState('');

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);
  return (
    <div className="w-full h-full">
      {labelTags && (
        <div className="mb-1 flex">
          <p className="text-white">{labelTags}</p>
        </div>
      )}

      <div className="flex gap-2 items-center justify-start w-fit">
        {tags.map((tag, index) => (
          <Tag
            key={index}
            text={tag.text ? tag.text : tag}
            remove={() => remove(index)}
            handleTagSelection={handleTagSelection}
            selectedTags={selectedTags}
            icon={tag.icon}
          />
        ))}
      </div>
      <div>
        <label>Otro:</label>
        <div className="flex gap-2">
          <Input onChange={(e) => setOtro(e.target.value)} value={otro} />
          <Button
            onClick={(e) => {
              e.preventDefault();
              setTags([...tags, otro]);
              setOtro('');
            }}
          >
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
};
