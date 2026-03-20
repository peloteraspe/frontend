export const EVENT_SOLD_OUT_DB_ERROR = 'EVENT_SOLD_OUT';
export const EVENT_SOLD_OUT_MESSAGE = 'Este evento ya completó sus cupos. Ya no acepta más inscripciones.';

function asNumber(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function getPlacesLeft(maxUsers: unknown, approvedCount: unknown) {
  const max = asNumber(maxUsers, 0);
  const approved = asNumber(approvedCount, 0);
  if (max <= 0) return 0;
  return Math.max(max - approved, 0);
}

export function isEventSoldOut(maxUsers: unknown, approvedCount: unknown) {
  const max = asNumber(maxUsers, 0);
  if (max <= 0) return false;
  return asNumber(approvedCount, 0) >= max;
}

export function isEventSoldOutError(error: unknown) {
  return String((error as any)?.message ?? '')
    .trim()
    .toUpperCase()
    .includes(EVENT_SOLD_OUT_DB_ERROR);
}
