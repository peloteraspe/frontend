export type EventUpsertInput = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  price: number;
  minUsers: number;
  maxUsers: number;
  district: string;
  locationText: string;
  lat: number;
  lng: number;
  eventTypeId: number;
  levelId: number;
};

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseEventFormData(fd: FormData): EventUpsertInput {
  return {
    title: String(fd.get('title') || ''),
    description: String(fd.get('description') || ''),
    startTime: String(fd.get('startTime') || ''),
    endTime: String(fd.get('endTime') || ''),
    price: parseNumber(fd.get('price'), 0),
    minUsers: parseNumber(fd.get('minUsers'), 0),
    maxUsers: parseNumber(fd.get('maxUsers'), 0),
    district: String(fd.get('district') || ''),
    locationText: String(fd.get('locationText') || ''),
    lat: parseNumber(fd.get('lat'), 0),
    lng: parseNumber(fd.get('lng'), 0),
    eventTypeId: parseNumber(fd.get('eventTypeId'), 1),
    levelId: parseNumber(fd.get('levelId'), 1),
  };
}
