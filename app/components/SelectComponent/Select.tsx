'use client'
import SelectComponent, { OptionSelect } from '@/components/SelectComponent';
import { useState } from 'react';
import { options } from '@/utils/data';
const SelectForm = () => {
 
  const [selectedSingleOption, setSelectedSingleOption] = useState<OptionSelect | null>();
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<OptionSelect[] | null>(null);

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Selecciona una opción
        </label>
        <SelectComponent
          options={options}
          onChange={(value: any) => setSelectedSingleOption(value)} 
          isMulti={false}
          value={selectedSingleOption}
        />
       {selectedSingleOption && (
          <p className="text-sm text-gray-600  font-semibold">Valor seleccionado: {selectedSingleOption.label}</p>
        )}
      </div>

      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Selecciona una opción (Múltiple)
        </label>
        <SelectComponent
          options={options}
          onChange={(value: any) => setSelectedMultiOptions(value)}  // TODO: Fix this type error
          isMulti={true}
          value={selectedMultiOptions}
        />
        {selectedMultiOptions && (
          <div>
            <p className="text-sm text-gray-600  font-medium ">Valores seleccionados:</p>
            <ul className="list-disc pl-4">
              {selectedMultiOptions.map((option) => (
                <li key={option.value}>{option.label}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectForm;
