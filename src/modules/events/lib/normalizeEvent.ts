import { EventEntity } from '@modules/events/model/types';
import { getPlacesLeft, isEventSoldOut } from './eventCapacity';

type Dictionary = Record<number, string>;
const DEFAULT_TIMEZONE = 'America/Lima';

function asNumber(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function extractDescription(value: unknown) {
  if (value && typeof value === 'object') {
    const maybe = value as { description?: string };
    return asString(maybe.description, '');
  }
  return asString(value, '');
}

function extractLocationReference(value: unknown) {
  if (value && typeof value === 'object') {
    const maybe = value as { location_reference?: string; locationReference?: string };
    return asString(maybe.location_reference ?? maybe.locationReference, '');
  }
  return '';
}

function extractLatLng(location: unknown) {
  if (!location || typeof location !== 'object') {
    return { lat: 0, lng: 0 };
  }

  const loc = location as { lat?: number; lng?: number; long?: number };
  const lat = asNumber(loc.lat, 0);
  const lng = asNumber(loc.lng ?? loc.long, 0);
  return { lat, lng };
}

function formatDateLabel(startTime: string | null) {
  if (!startTime) return 'Fecha por confirmar';
  const dt = new Date(startTime);
  if (Number.isNaN(dt.getTime())) return 'Fecha por confirmar';

  return dt.toLocaleString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DEFAULT_TIMEZONE,
  });
}

export function normalizeEvent(raw: any, eventTypeById: Dictionary, levelById: Dictionary): EventEntity {
  const location = extractLatLng(raw?.location);
  const eventTypeId = raw?.EventType == null ? null : asNumber(raw.EventType, 0);
  const levelId = raw?.level == null ? null : asNumber(raw.level, 0);
  const maxUsers = asNumber(raw?.max_users, 0);
  const approvedCount = asNumber(raw?.approvedCount, 0);

  return {
    id: String(raw?.id ?? ''),
    title: asString(raw?.title, 'Evento sin título'),
    description: extractDescription(raw?.description),
    dateLabel: formatDateLabel(raw?.start_time ?? null),
    startTime: raw?.start_time ?? null,
    endTime: raw?.end_time ?? null,
    placeText: asString(raw?.place_text ?? raw?.placeText, ''),
    locationText: asString(raw?.location_text ?? raw?.locationText, 'Ubicación por confirmar'),
    locationReference: extractLocationReference(raw?.description),
    district: asString(raw?.district, ''),
    location,
    price: asNumber(raw?.price, 0),
    minUsers: asNumber(raw?.min_users, 0),
    maxUsers,
    eventTypeId,
    eventTypeName: eventTypeId ? eventTypeById[eventTypeId] ?? 'Partido' : 'Partido',
    levelId,
    levelName: levelId ? levelById[levelId] ?? 'Sin nivel' : 'Sin nivel',
    createdBy: asString(raw?.created_by, 'Peloteras'),
    createdById: raw?.created_by_id ? String(raw.created_by_id) : null,
    isPublished: raw?.is_published !== false,
    isFeatured: raw?.is_featured === true,
    approvedCount,
    placesLeft: getPlacesLeft(maxUsers, approvedCount),
    isSoldOut: isEventSoldOut(maxUsers, approvedCount),
  };
}
