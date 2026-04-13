export function getEventTimestamp(value: string | null | undefined) {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function hasEventStarted(startTime: string | null | undefined, referenceTime = Date.now()) {
  const timestamp = getEventTimestamp(startTime);
  if (timestamp == null) return false;
  return timestamp <= referenceTime;
}

export function hasEventEnded(
  endTime: string | null | undefined,
  referenceTime = Date.now(),
  fallbackStartTime?: string | null | undefined
) {
  const timestamp = getEventTimestamp(endTime) ?? getEventTimestamp(fallbackStartTime);
  if (timestamp == null) return false;
  return timestamp <= referenceTime;
}
