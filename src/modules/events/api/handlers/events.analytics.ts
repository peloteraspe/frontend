import { NextResponse } from 'next/server';

import { clientIdentifierFromRequest, rateLimitByRequest } from '@core/api/rateLimit';
import { log } from '@core/lib/logger';
import { getServerSupabase } from '@core/api/supabase.server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AnalyticsInput = Record<string, unknown>;

function sanitizeText(value: unknown, maxLength = 120) {
  return String(value ?? '')
    .trim()
    .slice(0, maxLength);
}

function parseEventId(value: unknown) {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseUuid(value: unknown) {
  const raw = sanitizeText(value, 80);
  return UUID_REGEX.test(raw) ? raw : null;
}

function parsePayload(input: AnalyticsInput) {
  const candidate = input.payload;
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    return candidate as Record<string, unknown>;
  }

  const payload: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (
      key === 'event' ||
      key === 'event_name' ||
      key === 'event_id' ||
      key === 'ref_user' ||
      key === 'ref_user_id' ||
      key === 'source' ||
      key === 'channel'
    ) {
      return;
    }
    payload[key] = value;
  });
  return payload;
}

async function parseRequestBody(request: Request): Promise<AnalyticsInput> {
  const raw = await request.text().catch(() => '');
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as AnalyticsInput;
    }
  } catch {
    return {};
  }

  return {};
}

export async function POST(request: Request) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'api_analytics_events_post',
    limit: 240,
    windowMs: 60_000,
    message: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.',
  });
  if (limited) return limited;

  try {
    const body = await parseRequestBody(request);
    const eventName = sanitizeText(body.event_name ?? body.event, 80).toLowerCase();

    if (!eventName) {
      return NextResponse.json({ error: 'event_name es obligatorio.' }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const eventId = parseEventId(body.event_id);
    const refUserId = parseUuid(body.ref_user_id ?? body.ref_user);
    const source = sanitizeText(body.source, 80) || 'web';
    const channel = sanitizeText(body.channel, 80) || null;
    const userAgent = sanitizeText(request.headers.get('user-agent'), 1024) || null;
    const ipAddress = sanitizeText(clientIdentifierFromRequest(request), 100) || null;
    const payload = parsePayload(body);

    const { error } = await supabase.from('product_analytics_events').insert({
      event_name: eventName,
      user_id: user?.id ?? null,
      event_id: eventId,
      ref_user_id: refUserId,
      source,
      channel,
      user_agent: userAgent,
      ip_address: ipAddress,
      payload,
    });

    if (error) {
      log.warn('No se pudo registrar evento de analitica', 'ANALYTICS', {
        eventName,
        code: error.code,
        message: error.message,
      });

      const message = (error.message || '').toLowerCase();
      if (message.includes('product_analytics_events') && message.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Falta la migracion de product_analytics_events en Supabase.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: false }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ ok: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    log.warn('Solicitud invalida en analytics events', 'ANALYTICS', error?.message || error);
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 });
  }
}
