import { useEffect, useState } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';

const PlacesAutocomplete = ({
  onAddressSelect,
  defaultValue,
  label,
}: {
  defaultValue?: string;
  onAddressSelect?: ({
    address,
    latLng,
  }) => void;
  label?: string;
}) => {
  const [defaultAddress, setDefaultAddress] = useState(defaultValue || '');
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: {
        country: 'pe',
      },
    },
    debounce: 300,
    cache: 86400,
  });

  const renderSuggestions = () => {
    return data.map((suggestion) => {
      const {
        place_id,
        structured_formatting: { main_text, secondary_text },
        description,
      } = suggestion;

      return (
        <li
          key={place_id}
          className="p-2 hover:bg-gray-100 text-black"
          onClick={async () => {
            const latLng = await getGeocode({ placeId: place_id }).then(
              (results) => getLatLng(results[0])
            );
            setValue(description + '-' + latLng, false);
            setDefaultAddress(description);
            onAddressSelect &&
              onAddressSelect({
                address: description,
                latLng,
              });

            clearSuggestions();
          }}
        >
          <strong>{main_text}</strong> <small>{secondary_text}</small>
        </li>
      );
    });
  };

  useEffect(() => {
    setDefaultAddress(defaultValue || '');
  }, [defaultValue]);
  return (
    <div className="">
      <label className="block font-medium text-white text-base">
        {label || 'Dirección'}
      </label>
      <input
        value={defaultAddress}
        disabled={!ready}
        onChange={(e) => {
          setValue(e.target.value);
          setDefaultAddress(e.target.value);
        }}
        placeholder="Escribe aquí la dirección"
        className="w-full bg-transparent text-disabled border border-primary rounded-md shadow-sm px-4 py-2 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
      />

      {status === 'OK' && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-2 cursor-pointer p-2">
          {renderSuggestions()}
        </ul>
      )}
    </div>
  );
};

export default PlacesAutocomplete;
