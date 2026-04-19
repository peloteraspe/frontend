import { resolveAppOrigin } from '@modules/auth/lib/redirect';
import { buildQrImageUrl } from '@shared/lib/qr';

export const CHECKIN_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CHECKIN_QR_SIZE = 500;
const MIN_CHECKIN_QR_SIZE = 120;
const MAX_CHECKIN_QR_SIZE = 2000;

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function sanitizeCheckinSlug(value: string) {
  const normalized = stripDiacritics(String(value || '').trim().toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized;
}

export function isValidCheckinSlug(value: string) {
  return CHECKIN_SLUG_PATTERN.test(String(value || '').trim());
}

export function buildCheckinPath(slug: string) {
  const normalizedSlug = sanitizeCheckinSlug(slug);
  if (!normalizedSlug) return '/check-in';

  return `/check-in/${encodeURIComponent(normalizedSlug)}`;
}

export function buildCheckinPublicUrl(slug: string, fallbackOrigin?: string | null) {
  const normalizedSlug = sanitizeCheckinSlug(slug);
  if (!normalizedSlug) return '';

  const origin = resolveAppOrigin(fallbackOrigin);
  return new URL(buildCheckinPath(normalizedSlug), `${origin}/`).toString();
}

export function normalizeCheckinQrSize(size?: number) {
  if (!Number.isFinite(size) || !size) return CHECKIN_QR_SIZE;

  return Math.min(MAX_CHECKIN_QR_SIZE, Math.max(MIN_CHECKIN_QR_SIZE, Math.round(size)));
}

export function buildCheckinQrSourceUrl(
  slug: string,
  options?: { size?: number; fallbackOrigin?: string | null }
) {
  const publicUrl = buildCheckinPublicUrl(slug, options?.fallbackOrigin);
  if (!publicUrl) return '';

  return buildQrImageUrl(publicUrl, normalizeCheckinQrSize(options?.size));
}

export function buildCheckinQrImageUrl(
  slug: string,
  options?: { size?: number; download?: boolean }
) {
  const normalizedSlug = sanitizeCheckinSlug(slug);
  if (!normalizedSlug) return '';

  const params = new URLSearchParams({
    slug: normalizedSlug,
    size: String(normalizeCheckinQrSize(options?.size)),
  });

  if (options?.download) {
    params.set('download', '1');
  }

  return `/api/check-ins/qr?${params.toString()}`;
}
