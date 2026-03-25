import { NextResponse } from 'next/server';

import { log } from '@core/lib/logger';
import { sendEventTicketRemindersOneHourBefore } from '@modules/events/api/services/eventTicketReminder.service';

export const dynamic = 'force-dynamic';

function resolveRequestOrigin(request: Request) {
  const configuredBaseUrl = String(
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  ).trim();
  const forwardedHost = String(request.headers.get('x-forwarded-host') || '').trim();
  const forwardedProto = String(request.headers.get('x-forwarded-proto') || '').trim() || 'https';
  const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : '';

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(forwardedOrigin)) {
    return forwardedOrigin;
  }

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (forwardedHost) {
    return forwardedOrigin;
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin)) {
      return requestOrigin;
    }

    return configuredBaseUrl || requestOrigin;
  } catch {
    return configuredBaseUrl || 'https://peloteras.com';
  }
}

function isAuthorizedCronRequest(request: Request) {
  if (String(request.headers.get('x-vercel-cron') || '').trim()) {
    return true;
  }

  const cronSecret = String(process.env.CRON_SECRET || process.env.EVENT_REMINDER_CRON_SECRET || '').trim();
  if (cronSecret) {
    const authorization = String(request.headers.get('authorization') || '').trim();
    return authorization === `Bearer ${cronSecret}`;
  }

  return process.env.NODE_ENV !== 'production';
}

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const baseUrl = resolveRequestOrigin(request);
    const result = await sendEventTicketRemindersOneHourBefore({ baseUrl });

    return NextResponse.json({
      ok: true,
      baseUrl,
      ...result,
    });
  } catch (error) {
    log.error('Event ticket reminder cron failed', 'EVENT_REMINDERS', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'No se pudo enviar el recordatorio.',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
