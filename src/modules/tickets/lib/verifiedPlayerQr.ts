import { resolveAppOrigin } from '@modules/auth/lib/redirect';

const LEGACY_TICKET_PREFIX = 'PELOTERAS:TICKET:';
const VERIFIED_PLAYER_SEGMENT = 'verified-player';
const VERIFIED_PLAYER_PATTERN = /^\/admin\/events\/(?<eventId>\d+)\/verified-player\/(?<userId>[^/?#]+)\/?$/i;

type BuildVerifiedPlayerUrlInput = {
  eventId: string | number;
  userId: string;
  fallbackOrigin?: string | null;
};

export function buildVerifiedPlayerPath(eventId: string | number, userId: string) {
  const normalizedEventId = encodeURIComponent(String(eventId).trim());
  const normalizedUserId = encodeURIComponent(String(userId).trim());
  return `/admin/events/${normalizedEventId}/${VERIFIED_PLAYER_SEGMENT}/${normalizedUserId}`;
}

export function buildVerifiedPlayerUrl(input: BuildVerifiedPlayerUrlInput) {
  const origin = resolveAppOrigin(input.fallbackOrigin);
  return new URL(buildVerifiedPlayerPath(input.eventId, input.userId), `${origin}/`).toString();
}

export function buildTicketQrImageUrl(value: string, size = 260) {
  const normalizedSize = Number.isFinite(size) && size > 0 ? Math.round(size) : 260;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${normalizedSize}x${normalizedSize}&qzone=2&data=${encodeURIComponent(value)}`;
}

export function normalizeLegacyTicketQrToken(rawValue: string) {
  const clean = String(rawValue || '').trim();
  if (!clean) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('/')) {
    return null;
  }

  const normalized = clean.startsWith(LEGACY_TICKET_PREFIX)
    ? clean.slice(LEGACY_TICKET_PREFIX.length).trim()
    : clean;

  return normalized || null;
}

function resolveCandidatePath(rawValue: string) {
  const clean = rawValue.trim();
  if (!clean) return null;

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      return new URL(clean).pathname;
    } catch {
      return null;
    }
  }

  if (clean.startsWith('/')) return clean;
  return `/${clean}`;
}

export function parseVerifiedPlayerQrValue(rawValue: string) {
  const clean = String(rawValue || '').trim();
  if (!clean) return null;

  const candidatePath = resolveCandidatePath(clean);
  if (!candidatePath) return null;

  const match = candidatePath.match(VERIFIED_PLAYER_PATTERN);
  if (!match?.groups?.eventId || !match.groups.userId) return null;

  const eventId = Number(match.groups.eventId);
  const userId = decodeURIComponent(match.groups.userId);
  if (!Number.isInteger(eventId) || eventId <= 0 || !userId) return null;

  return {
    eventId,
    userId,
    path: buildVerifiedPlayerPath(eventId, userId),
  };
}
