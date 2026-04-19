import { NextResponse } from 'next/server';
import { jsonNoStore } from '@core/api/responses';
import { rateLimitByRequest } from '@core/api/rateLimit';
import { log } from '@core/lib/logger';
import {
  CheckinServiceError,
  createCheckinRegistration,
} from '@modules/checkins/api/services/checkins.service';

export async function POST(request: Request) {
  const limited = await rateLimitByRequest(request, {
    keyPrefix: 'checkin-register',
    limit: 10,
    windowMs: 10 * 60 * 1000,
    message: 'Has enviado demasiados registros. Intenta de nuevo en unos minutos.',
  });

  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const registration = await createCheckinRegistration({
      checkinId: String(body?.checkinId || ''),
      firstName: String(body?.firstName || ''),
      lastName: String(body?.lastName || ''),
      email: String(body?.email || ''),
      phone: String(body?.phone || ''),
    });

    return jsonNoStore(
      {
        registration,
        message: 'Tu registro fue enviado correctamente.',
      },
      201
    );
  } catch (error: any) {
    if (error instanceof CheckinServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    log.error('Create public check-in registration failed', 'CHECKINS', error);
    return NextResponse.json({ error: 'No se pudo enviar tu registro.' }, { status: 500 });
  }
}
