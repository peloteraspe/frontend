function normalizeEventTypeName(rawName: unknown) {
  return String(rawName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isVersusEventTypeName(rawName: unknown) {
  const normalized = normalizeEventTypeName(rawName);
  if (!normalized) return false;

  if (normalized.includes('versus')) return true;
  if (/\bvs\b/.test(normalized)) return true;
  if (normalized.includes('equipo')) return true;

  return false;
}
