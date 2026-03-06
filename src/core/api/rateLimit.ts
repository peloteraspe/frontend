import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { log } from '@core/lib/logger';

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
  identifier?: string;
  message?: string;
};

type ConsumeResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  limit: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __peloterasRateLimitStore: Map<string, Bucket> | undefined;
  // eslint-disable-next-line no-var
  var __peloterasUpstashRedis: Redis | undefined;
  // eslint-disable-next-line no-var
  var __peloterasUpstashRateLimiters: Map<string, Ratelimit> | undefined;
  // eslint-disable-next-line no-var
  var __peloterasRateLimitWarned: boolean | undefined;
}

function getStore() {
  if (!globalThis.__peloterasRateLimitStore) {
    globalThis.__peloterasRateLimitStore = new Map<string, Bucket>();
  }
  return globalThis.__peloterasRateLimitStore;
}

function upstashIsConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function toUpstashWindow(windowMs: number) {
  const seconds = Math.max(Math.ceil(windowMs / 1000), 1);
  return `${seconds} s` as const;
}

function getUpstashRedis() {
  if (!upstashIsConfigured()) return null;

  if (!globalThis.__peloterasUpstashRedis) {
    globalThis.__peloterasUpstashRedis = Redis.fromEnv();
  }

  return globalThis.__peloterasUpstashRedis;
}

function getUpstashRateLimitersStore() {
  if (!globalThis.__peloterasUpstashRateLimiters) {
    globalThis.__peloterasUpstashRateLimiters = new Map<string, Ratelimit>();
  }
  return globalThis.__peloterasUpstashRateLimiters;
}

function getUpstashRatelimit(options: RateLimitOptions) {
  const redis = getUpstashRedis();
  if (!redis) return null;

  const key = `${options.keyPrefix}:${options.limit}:${options.windowMs}`;
  const store = getUpstashRateLimitersStore();
  const existing = store.get(key);
  if (existing) return existing;

  const configuredTimeout = Number(process.env.UPSTASH_RATELIMIT_TIMEOUT_MS || 1500);
  const timeout = Number.isFinite(configuredTimeout) ? Math.max(Math.floor(configuredTimeout), 250) : 1500;

  const created = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.limit, toUpstashWindow(options.windowMs)),
    prefix: `peloteras:${options.keyPrefix}`,
    analytics: process.env.UPSTASH_RATELIMIT_ANALYTICS === 'true',
    timeout,
  });

  store.set(key, created);
  return created;
}

function normalizeIdentifier(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function parseForwardedFor(value: string | null) {
  if (!value) return '';
  const first = value.split(',')[0];
  return first ? first.trim() : '';
}

function parseForwardedHeader(value: string | null) {
  if (!value) return '';
  const match = value.match(/for=(?:"?\[?([^;\]" ]+)\]?"?)/i);
  return match?.[1]?.trim() || '';
}

function pickClientIdentifier(headers: Headers) {
  const candidates = [
    parseForwardedFor(headers.get('x-forwarded-for')),
    normalizeIdentifier(headers.get('x-real-ip')),
    normalizeIdentifier(headers.get('cf-connecting-ip')),
    parseForwardedFor(headers.get('x-vercel-forwarded-for')),
    parseForwardedHeader(headers.get('forwarded')),
  ];

  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  return 'anonymous';
}

function pruneStore(store: Map<string, Bucket>, now: number) {
  if (store.size < 2000) return;

  store.forEach((value, key) => {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  });

  if (store.size <= 4000) return;

  const keys = Array.from(store.keys());
  for (const key of keys) {
    store.delete(key);
    if (store.size <= 4000) break;
  }
}

function consumeInMemory({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): ConsumeResult {
  const now = Date.now();
  const store = getStore();
  pruneStore(store, now);

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      resetAt,
      retryAfterSeconds: 0,
      limit,
    };
  }

  current.count += 1;
  store.set(key, current);

  const allowed = current.count <= limit;
  const remaining = Math.max(limit - current.count, 0);
  const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);

  return {
    allowed,
    remaining,
    resetAt: current.resetAt,
    retryAfterSeconds: allowed ? 0 : retryAfterSeconds,
    limit,
  };
}

async function consumeWithUpstash(
  identifier: string,
  options: RateLimitOptions
): Promise<ConsumeResult | null> {
  if (!upstashIsConfigured()) {
    if (!globalThis.__peloterasRateLimitWarned) {
      globalThis.__peloterasRateLimitWarned = true;
      log.warn(
        'UPSTASH_REDIS_REST_URL/TOKEN no configurados; rate limit en memoria',
        'RATE_LIMIT'
      );
    }
    return null;
  }

  try {
    const ratelimit = getUpstashRatelimit(options);
    if (!ratelimit) return null;

    const now = Date.now();
    const result = await ratelimit.limit(identifier);
    const resetAt =
      typeof result.reset === 'number' && Number.isFinite(result.reset)
        ? result.reset
        : now + options.windowMs;
    const allowed = Boolean(result.success);
    const remaining =
      typeof result.remaining === 'number' && Number.isFinite(result.remaining)
        ? Math.max(result.remaining, 0)
        : 0;
    const limit =
      typeof result.limit === 'number' && Number.isFinite(result.limit)
        ? result.limit
        : options.limit;
    const retryAfterSeconds = allowed ? 0 : Math.max(Math.ceil((resetAt - now) / 1000), 1);

    return {
      allowed,
      remaining,
      resetAt,
      retryAfterSeconds,
      limit,
    };
  } catch (error: any) {
    log.error('Upstash rate limit failed, fallback en memoria', 'RATE_LIMIT', error, {
      keyPrefix: options.keyPrefix,
    });
    return null;
  }
}

function tooManyRequestsResponse({
  message,
  limit,
  remaining,
  resetAt,
  retryAfterSeconds,
}: {
  message: string;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}

export function clientIdentifierFromRequest(request: Request) {
  return pickClientIdentifier(request.headers);
}

export async function rateLimitByIdentifier(options: RateLimitOptions) {
  const identifier = normalizeIdentifier(options.identifier) || 'anonymous';
  const key = `${options.keyPrefix}:${identifier}`;
  const result =
    (await consumeWithUpstash(identifier, options)) ||
    consumeInMemory({
      key,
      limit: options.limit,
      windowMs: options.windowMs,
    });

  if (result.allowed) return null;

  return tooManyRequestsResponse({
    message: options.message || 'Demasiadas solicitudes. Inténtalo nuevamente en unos segundos.',
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.resetAt,
    retryAfterSeconds: result.retryAfterSeconds,
  });
}

export async function rateLimitByRequest(
  request: Request,
  options: Omit<RateLimitOptions, 'identifier'> & { identifier?: string }
) {
  const identifier = options.identifier || clientIdentifierFromRequest(request);
  return rateLimitByIdentifier({ ...options, identifier });
}
