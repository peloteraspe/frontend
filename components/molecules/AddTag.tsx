import React, { useState } from 'react';

export const AddTag = ({
  placeholderText,
  setFormValue,
  onClick,
  selectPlaceholder,
  selectSetFormValue,
  selectOptions,
  ...register
}) => {
  const [tag, setTag] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [selectedTags, setSelectedTags] = useState({});

  const handleTagChange = (event) => {
    setTag(event.target.value);
  };

  const handleCustomTagChange = (event) => {
    setCustomTag(event.target.value);
  };

  const handleAddCustomTag = (e) => {
    e.preventDefault();
    setFormValue(customTag);
    onClick();
    setCustomTag('');
    setSelectedTags({ ...selectedTags, [customTag]: true });
  };

  const handleTagSelection = (tag) => {
    setSelectedTags((prevSelectedTags) => ({
      ...prevSelectedTags,
      [tag]: !prevSelectedTags[tag],
    }));
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap mb-2">
        {selectOptions &&
          selectOptions.map((option, index) => (
            <span
              key={index}
              className={`mr-2 mb-2 px-2 py-1 cursor-pointer rounded ${
                selectedTags[option.value] ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
              onClick={() => handleTagSelection(option.value)}
            >
              {option.label}
            </span>
          ))}
      </div>
      <div className="flex items-center">
        <label className="mr-2">Otro:</label>
        <input
          className="mr-2 p-2 border rounded"
          type="text"
          placeholder="Añadir tag"
          value={customTag}
          onChange={handleCustomTagChange}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={handleAddCustomTag}
        >
          Añadir
        </button>
      </div>
    </div>
  );
};