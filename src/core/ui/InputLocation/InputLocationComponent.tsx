'use client';

import { Autocomplete, LoadScript } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import React, { useState } from 'react';
import { log } from '@src/core/lib/logger';

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

const InputLocation: React.FC = () => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place && place.place_id) {
        log.debug('Place selected', 'INPUT_LOCATION', {
          placeId: place.place_id,
          address: place.formatted_address,
        });
      } else {
        log.warn('No valid place selected from autocomplete', 'INPUT_LOCATION');
      }
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}
      libraries={GOOGLE_MAPS_LIBRARIES}
    >
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          types: ['(regions)'],
          componentRestrictions: { country: 'pe' },
          strictBounds: true,
          fields: ['name'],
        }}
      >
        <input type="text" placeholder="Escribe un distrito de Perú" />
      </Autocomplete>
    </LoadScript>
  );
};

export default InputLocation;
