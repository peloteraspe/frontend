import { normalizeDateTimeLocalToLima } from '@shared/lib/dateTime';
import { getEventPublishReadiness } from '@modules/admin/model/eventPublishReadiness';

export type EventUpsertInput = {
  title: string;
  description: string;
  descriptionHtml: string;
  startTime: string;
  endTime: string;
  price: number;
  minUsers: number;
  maxUsers: number;
  district: string;
  placeText: string;
  locationText: string;
  lat: number;
  lng: number;
  eventTypeId: number;
  levelId: number;
  featureIds: number[];
  paymentMethodIds: number[];
  isPublished: boolean;
  isFieldReservedConfirmed: boolean;
  isFeatured: boolean;
};

function toTimestamp(value: string) {
  const normalized = normalizeDateTimeLocalToLima(value);
  if (!normalized) return null;
  const timestamp = new Date(normalized).getTime();
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

function parseNumberList(values: FormDataEntryValue[]) {
  const unique = new Set<number>();
  values.forEach((value) => {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      unique.add(parsed);
    }
  });
  return Array.from(unique);
}

function normalizeDistrict(value: FormDataEntryValue | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const [district] = raw.split(',');
  return String(district || '').trim();
}

export function parseEventFormData(fd: FormData): EventUpsertInput {
  const rawStartTime = String(fd.get('startTime') || '').trim();
  const rawEndTime = String(fd.get('endTime') || '').trim();

  return {
    title: String(fd.get('title') || ''),
    description: String(fd.get('description') || ''),
    descriptionHtml: String(fd.get('descriptionHtml') || ''),
    startTime: normalizeDateTimeLocalToLima(rawStartTime) ?? rawStartTime,
    endTime: normalizeDateTimeLocalToLima(rawEndTime) ?? rawEndTime,
    price: parseNumber(fd.get('price'), 0),
    minUsers: parseNumber(fd.get('minUsers'), 0),
    maxUsers: parseNumber(fd.get('maxUsers'), 0),
    district: normalizeDistrict(fd.get('district')),
    placeText: String(fd.get('placeText') || ''),
    locationText: String(fd.get('locationText') || ''),
    lat: parseNumber(fd.get('lat'), 0),
    lng: parseNumber(fd.get('lng'), 0),
    eventTypeId: parseNumber(fd.get('eventTypeId'), 1),
    levelId: parseNumber(fd.get('levelId'), 1),
    featureIds: parseNumberList(fd.getAll('featureIds')),
    paymentMethodIds: parseNumberList(fd.getAll('paymentMethodIds')),
    isPublished: parseBoolean(fd.get('isPublished')),
    isFieldReservedConfirmed: parseBoolean(fd.get('isFieldReservedConfirmed')),
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

  if (!input.isPublished) return;

  const publishReadiness = getEventPublishReadiness({
    title: input.title,
    startTime: input.startTime,
    endTime: input.endTime,
    district: input.district,
    locationText: input.locationText,
    lat: input.lat,
    lng: input.lng,
    paymentMethodIds: input.paymentMethodIds,
    isFieldReservedConfirmed: input.isFieldReservedConfirmed,
  });

  if (!publishReadiness.isReady && publishReadiness.primaryMessage) {
    throw new Error(publishReadiness.primaryMessage);
  }
}
