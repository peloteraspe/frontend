type RedirectQueryValue = string | number | boolean | null | undefined;

type RedirectOptions = {
  fallbackOrigin?: string | null;
  query?: Record<string, RedirectQueryValue>;
};

export function sanitizeNextPath(value: string | null | undefined) {
  const next = String(value || '').trim();
  if (!next) return null;
  if (!next.startsWith('/')) return null;
  if (next.startsWith('//')) return null;
  if (next.startsWith('/auth/callback')) return null;
  return next;
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizeHostOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  const host = value.trim().replace(/^https?:\/\//i, '');
  if (!host) return null;
  const protocol =
    host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return normalizeOrigin(`${protocol}://${host}`);
}

export function resolveAppOrigin(fallbackOrigin?: string | null) {
  const configured =
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeHostOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeHostOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeHostOrigin(process.env.VERCEL_URL);

  if (configured) return configured;

  const fallback = normalizeOrigin(fallbackOrigin);
  if (fallback) return fallback;

  if (typeof window !== 'undefined') return window.location.origin;

  return 'http://localhost:3000';
}

function buildAuthUrl(pathname: string, options?: RedirectOptions) {
  const origin = resolveAppOrigin(options?.fallbackOrigin);
  const url = new URL(pathname, `${origin}/`);

  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === null || value === undefined || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function authCallbackUrl(options?: {
  email?: string | null;
  nextPath?: string | null;
  fallbackOrigin?: string | null;
}) {
  const safeNextPath = sanitizeNextPath(options?.nextPath ?? null);
  return buildAuthUrl('/auth/callback', {
    fallbackOrigin: options?.fallbackOrigin,
    query: {
      ...(options?.email ? { email: options.email } : {}),
      ...(safeNextPath ? { next: safeNextPath } : {}),
    },
  });
}

export function authRecoveryUrl(
  nextPath = '/auth/reset-password',
  options?: { fallbackOrigin?: string | null }
) {
  return buildAuthUrl('/auth/recovery', {
    fallbackOrigin: options?.fallbackOrigin,
    query: { next: nextPath },
  });
}

export function oauthRedirectTo(options?: { nextPath?: string | null; fallbackOrigin?: string | null }) {
  return authCallbackUrl({
    nextPath: options?.nextPath,
    fallbackOrigin: options?.fallbackOrigin,
  });
}
