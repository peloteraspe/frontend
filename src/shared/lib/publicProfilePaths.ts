function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizePublicHandle(value: string) {
  return safeDecode(String(value || ''))
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

export function buildPublicTeamPath(slug: string) {
  const normalizedSlug = normalizePublicHandle(slug);
  return `/equipo/@${encodeURIComponent(normalizedSlug)}`;
}

export function buildPublicPlayerPath(username: string) {
  const normalizedUsername = normalizePublicHandle(username);
  return `/jugadora/@${encodeURIComponent(normalizedUsername)}`;
}
