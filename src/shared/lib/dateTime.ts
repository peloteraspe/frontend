const LOCAL_DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const HAS_TIMEZONE_SUFFIX_RE = /(z|[+-]\d{2}:\d{2})$/i;

export const DEFAULT_EVENT_TIMEZONE = 'America/Lima';
export const DEFAULT_EVENT_UTC_OFFSET = '-05:00';

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? '';
}

function isValidDateTimeParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
) {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;

  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second
  );
}

export function normalizeDateTimeLocalToLima(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (HAS_TIMEZONE_SUFFIX_RE.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : raw;
  }

  const match = raw.match(LOCAL_DATE_TIME_RE);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? '0');

  if (!isValidDateTimeParts(year, month, day, hour, minute, second)) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}${DEFAULT_EVENT_UTC_OFFSET}`;
}

export function toDateTimeLocalInTimeZone(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_EVENT_TIMEZONE
) {
  if (!value) return '';

  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(parsed);
  const year = readPart(parts, 'year');
  const month = readPart(parts, 'month');
  const day = readPart(parts, 'day');
  const hour = readPart(parts, 'hour');
  const minute = readPart(parts, 'minute');

  if (!year || !month || !day || !hour || !minute) return '';
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function getIsoDateInTimeZone(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_EVENT_TIMEZONE
) {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(parsed);
  const year = readPart(parts, 'year');
  const month = readPart(parts, 'month');
  const day = readPart(parts, 'day');

  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

export function formatTimeInTimeZoneWithMeridiem(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_EVENT_TIMEZONE
) {
  if (!value) return '';

  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const parts = formatter.formatToParts(parsed);
  const hour = readPart(parts, 'hour');
  const minute = readPart(parts, 'minute');
  const dayPeriod = readPart(parts, 'dayPeriod').toLowerCase();

  if (!hour || !minute || !dayPeriod) return '';

  const suffix =
    dayPeriod === 'am' ? 'a.m.' : dayPeriod === 'pm' ? 'p.m.' : dayPeriod.toLowerCase();

  return `${hour}:${minute} ${suffix}`;
}
