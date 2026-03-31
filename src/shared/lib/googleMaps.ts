import type { Libraries } from '@react-google-maps/api';

export const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];
export const LIMA_DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 };

const DISTRICT_COMPONENT_PRIORITY = [
  'administrative_area_level_3',
  'locality',
  'sublocality_level_1',
  'sublocality',
  'administrative_area_level_2',
  'administrative_area_level_1',
] as const;

export type DistrictOption = {
  id: string;
  type: string;
  value: string;
  label: string;
};

export function normalizeDistrictKey(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function mergeDistrictOptions(current: DistrictOption[], next: DistrictOption[]) {
  const merged = [...current];
  const seen = new Set(current.map((item) => normalizeDistrictKey(item.value)));

  for (const option of next) {
    const key = normalizeDistrictKey(option.value);
    if (!key || seen.has(key)) continue;
    merged.push(option);
    seen.add(key);
  }

  return merged;
}

function addDistrictOption(
  options: DistrictOption[],
  seen: Set<string>,
  type: string,
  value: string
) {
  const normalizedValue = String(value || '').trim();
  const key = normalizeDistrictKey(normalizedValue);

  if (!key || seen.has(key)) return;

  seen.add(key);
  options.push({
    id: `${type}:${key}`,
    type,
    value: normalizedValue,
    label: normalizedValue,
  });
}

export function extractDistrictOptionsFromAddressComponents(
  components?: google.maps.GeocoderAddressComponent[] | null,
  formattedAddress?: string | null
) {
  const options: DistrictOption[] = [];
  const seen = new Set<string>();
  const safeComponents = Array.isArray(components) ? components : [];

  for (const type of DISTRICT_COMPONENT_PRIORITY) {
    for (const component of safeComponents) {
      if (!Array.isArray(component?.types) || !component.types.includes(type)) continue;
      addDistrictOption(options, seen, type, component.long_name || component.short_name || '');
    }
  }

  const formattedParts = String(formattedAddress || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (formattedParts.length > 1) {
    addDistrictOption(options, seen, 'formatted_address', formattedParts[1]);
  }

  return options;
}

export function getPrimaryDistrictValue(options: DistrictOption[], fallback = '') {
  if (options.length > 0) return options[0].value;
  return String(fallback || '').trim();
}

export function toLatLngLiteral(lat: number, lng: number) {
  return { lat: Number(lat), lng: Number(lng) };
}

export function toFixedLatLng(lat: number, lng: number) {
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

export function buildCircleMarkerIcon(color: string, scale: number): google.maps.Symbol | undefined {
  if (typeof google === 'undefined' || !google.maps) return undefined;

  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeOpacity: 1,
    strokeWeight: 2,
    scale,
  };
}
