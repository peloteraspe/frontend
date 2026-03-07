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
  isFeatured: boolean;
};

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
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
    district: String(fd.get('district') || '').trim(),
    locationText: String(fd.get('locationText') || ''),
    lat: parseNumber(fd.get('lat'), 0),
    lng: parseNumber(fd.get('lng'), 0),
    eventTypeId: parseNumber(fd.get('eventTypeId'), 1),
    levelId: parseNumber(fd.get('levelId'), 1),
    isFeatured: parseBoolean(fd.get('isFeatured')),
  };
}

export function validateEventFormInput(input: EventUpsertInput) {
  const startTimestamp = toTimestamp(input.startTime);
  const endTimestamp = toTimestamp(input.endTime);

  if (startTimestamp === null || endTimestamp === null) {
    throw new Error('Formato de fecha/hora inválido.');
  }

  if (endTimestamp <= startTimestamp) {
    throw new Error('La fecha y hora de fin debe ser posterior al inicio.');
  }

  if (!input.district.trim()) {
    throw new Error('Selecciona un distrito válido.');
  }
}
