function normalizeEventTypeName(rawName: unknown) {
  return String(rawName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type EventRegistrationMode = 'individual' | 'team' | 'both';

export function isVersusEventTypeName(rawName: unknown) {
  const normalized = normalizeEventTypeName(rawName);
  if (!normalized) return false;

  if (normalized.includes('versus')) return true;
  if (/\bvs\b/.test(normalized)) return true;
  if (normalized === 'partido entre equipos') return true;

  return false;
}

export function resolveEventRegistrationMode(
  rawMode: unknown,
  rawEventTypeName: unknown,
  allowsTeamRegistration = false
): EventRegistrationMode {
  if (rawMode === 'individual' || rawMode === 'team' || rawMode === 'both') {
    return rawMode;
  }

  if (isVersusEventTypeName(rawEventTypeName)) return 'team';
  return allowsTeamRegistration ? 'both' : 'individual';
}
