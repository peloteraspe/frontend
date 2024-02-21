"use client";

import { Autocomplete, LoadScript } from "@react-google-maps/api";
import React, { useState } from "react";

const InputLocation: React.FC = () => {
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      console.log("place:", place);
    } else {
      console.log("Selecciona un distrito del listado");
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}
      libraries={["places"]}
    >
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          types: ["(regions)"],
          componentRestrictions: { country: "pe" },
          strictBounds: true,
          fields: ["name"],
        }}
      >
        <input type="text" placeholder="Escribe un distrito de Perú" />
      </Autocomplete>
    </LoadScript>
  );
};

export default InputLocation;
