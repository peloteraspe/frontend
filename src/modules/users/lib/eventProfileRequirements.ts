import { resolveStoredPhone, validateInternationalPhone } from '@shared/lib/phone';

export const REQUIRED_EVENT_PROFILE_MESSAGE =
  'Completa tu celular y fecha de nacimiento para continuar.';
export const MINIMUM_PELOTERAS_AGE = 18;

export type EventProfileIntent = 'join_event' | 'create_event';

export type EventProfileMetadataSource = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

export type BirthDateValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

export function getTodayDateInputValue(now = new Date()) {
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
}

export function getLatestAdultBirthDate(now = new Date()) {
  const year = now.getFullYear() - MINIMUM_PELOTERAS_AGE;
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(now.getDate(), lastDayOfMonth);
  return `${year}-${padDatePart(month + 1)}-${padDatePart(day)}`;
}

export function validateBirthDate(
  value: unknown,
  latestAdultBirthDate = getLatestAdultBirthDate()
): BirthDateValidationResult {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return { ok: false, message: 'Ingresa tu fecha de nacimiento.' };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) {
    return { ok: false, message: 'Ingresa una fecha de nacimiento válida.' };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  if (!isRealDate || year < 1900) {
    return { ok: false, message: 'Ingresa una fecha de nacimiento válida.' };
  }

  if (normalized > latestAdultBirthDate) {
    return { ok: false, message: 'Debes tener 18 años o más para continuar.' };
  }

  return { ok: true, value: normalized };
}

export function resolveStoredBirthDate(source?: EventProfileMetadataSource | null) {
  const candidates = [
    source?.user_metadata?.birth_date,
    source?.user_metadata?.date_of_birth,
    source?.user_metadata?.birthday,
    source?.user_metadata?.fecha_nacimiento,
    source?.app_metadata?.birth_date,
    source?.app_metadata?.date_of_birth,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim();
    if (validateBirthDate(normalized).ok) return normalized;
  }

  return '';
}

export function getMissingEventProfileFields(source?: EventProfileMetadataSource | null) {
  const phone = resolveStoredPhone(source);
  const birthDate = resolveStoredBirthDate(source);

  return {
    phone: !validateInternationalPhone(phone).isValid,
    birthDate: !validateBirthDate(birthDate).ok,
  };
}

export function hasCompleteEventProfile(source?: EventProfileMetadataSource | null) {
  const missing = getMissingEventProfileFields(source);
  return !missing.phone && !missing.birthDate;
}

export function buildEventProfileCompletionPath(options: {
  nextPath: string;
  intent: EventProfileIntent;
}) {
  const params = new URLSearchParams({
    next: options.nextPath,
    intent: options.intent,
  });
  return `/complete-profile?${params.toString()}`;
}
