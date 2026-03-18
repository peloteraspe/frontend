import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import {
  sendAdminPaymentPendingReviewEmail,
  sendPaymentStatusEmail,
} from '../services/payment-status-email.service';

function parseEventId(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseOperationNumber(value: unknown) {
  const op = String(value ?? '').trim();
  return /^\d{8}$/.test(op) ? op : null;
}

function resolveRequestOrigin(request: Request) {
  const directOrigin = String(request.headers.get('origin') || '').trim();
  if (directOrigin) return directOrigin;

  const forwardedHost = String(request.headers.get('x-forwarded-host') || '').trim();
  const host = forwardedHost || String(request.headers.get('host') || '').trim();
  if (host) {
    const protoHeader = String(request.headers.get('x-forwarded-proto') || '').trim();
    const proto = protoHeader || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

function resolveDisplayName(name: string | null | undefined, email: string | null | undefined, fallback: string) {
  const safeName = String(name || '').trim();
  if (safeName) return safeName;

  const safeEmail = String(email || '').trim();
  if (safeEmail.includes('@')) return safeEmail.split('@')[0];

  return fallback;
}

async function loadProfileUsername(admin: ReturnType<typeof getAdminSupabase>, userId: string) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return null;

  const { data, error } = await admin
    .from('profile')
    .select('username')
    .eq('user', normalizedUserId)
    .maybeSingle();

  if (error) {
    log.database('SELECT profile username for payment confirm', 'profile', error, { userId: normalizedUserId });
    return null;
  }

  const username = String((data as any)?.username || '').trim();
  return username || null;
}

async function loadAuthUserEmail(admin: ReturnType<typeof getAdminSupabase>, userId: string) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return null;

  try {
    const { data, error } = await admin.auth.admin.getUserById(normalizedUserId);
    if (error) {
      log.warn('Could not load auth user email for payment confirm', 'PAYMENTS', {
        userId: normalizedUserId,
        error,
      });
      return null;
    }

    const email = String(data?.user?.email || '').trim();
    return email || null;
  } catch (error) {
    log.error('Auth user email lookup failed during payment confirm', 'PAYMENTS', error, {
      userId: normalizedUserId,
    });
    return null;
  }
}

async function notifyEventAdminPendingPayment(params: {
  admin: ReturnType<typeof getAdminSupabase>;
  baseUrl?: string | null;
  eventRow: Record<string, any> | null | undefined;
  participantUser: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, any>;
  };
  operationNumber: string;
}) {
  try {
    const organizerUserId = String(params.eventRow?.created_by_id || '').trim();
    if (!organizerUserId) {
      log.warn('Skipping admin pending payment email: event has no organizer user id', 'EMAIL', {
        eventId: params.eventRow?.id ?? null,
      });
      return;
    }

    const [organizerEmail, organizerProfileName, participantProfileName] = await Promise.all([
      loadAuthUserEmail(params.admin, organizerUserId),
      loadProfileUsername(params.admin, organizerUserId),
      loadProfileUsername(params.admin, params.participantUser.id),
    ]);

    if (!organizerEmail) {
      log.warn('Skipping admin pending payment email: organizer email not found', 'EMAIL', {
        eventId: params.eventRow?.id ?? null,
        organizerUserId,
      });
      return;
    }

    const participantEmail = String(params.participantUser.email || '').trim();
    const participantName = resolveDisplayName(
      participantProfileName ||
        String(params.participantUser.user_metadata?.username || params.participantUser.user_metadata?.name || ''),
      participantEmail,
      'Nueva inscrita'
    );
    const organizerName = resolveDisplayName(
      String(params.eventRow?.created_by || '').trim() || organizerProfileName,
      organizerEmail,
      'admin'
    );

    await sendAdminPaymentPendingReviewEmail({
      toEmail: organizerEmail,
      toName: organizerName,
      baseUrl: params.baseUrl,
      eventId: Number(params.eventRow?.id) || null,
      eventTitle: String(params.eventRow?.title || ''),
      eventStartTime: String(params.eventRow?.start_time || ''),
      eventLocation: String(params.eventRow?.location_text || ''),
      participantName,
      participantEmail,
      operationNumber: params.operationNumber,
    });
  } catch (error) {
    log.error('Admin pending payment email dispatch failed', 'EMAIL', error, {
      eventId: params.eventRow?.id ?? null,
      participantUserId: params.participantUser.id,
    });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const eventId = parseEventId(body?.eventId);
    const operationNumber = parseOperationNumber(body?.operationNumber);

    if (!eventId) {
      return NextResponse.json({ error: 'eventId inválido.' }, { status: 400 });
    }

    if (!operationNumber) {
      return NextResponse.json({ error: 'Número de operación inválido.' }, { status: 400 });
    }

    const admin = getAdminSupabase();
    const requestOrigin = resolveRequestOrigin(request);

    const { data: eventRow, error: eventError } = await admin
      .from('event')
      .select('id,start_time,title,location_text,is_published,created_by,created_by_id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      log.database('SELECT event for payment confirm', 'event', eventError, { eventId, userId: user.id });
      return NextResponse.json({ error: 'No se pudo validar el evento.' }, { status: 500 });
    }

    if (!eventRow) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    if ((eventRow as any)?.is_published === false) {
      return NextResponse.json(
        { error: 'Las inscripciones para este evento no están disponibles por el momento.' },
        { status: 409 }
      );
    }

    const eventStart = eventRow?.start_time ? new Date(String(eventRow.start_time)) : null;
    if (eventStart && !Number.isNaN(eventStart.getTime()) && eventStart.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Este evento ya inició o finalizó. La inscripción está cerrada.' },
        { status: 409 }
      );
    }

    const { data: existingAssistant, error: existingError } = await admin
      .from('assistants')
      .select('id,state,operationNumber')
      .eq('event', eventId)
      .eq('user', user.id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      log.database('SELECT assistants for payment confirm', 'assistants', existingError, {
        eventId,
        userId: user.id,
      });
      return NextResponse.json({ error: 'No se pudo validar la inscripción.' }, { status: 500 });
    }

    if (existingAssistant?.id) {
      const shouldNotifyPending =
        String(existingAssistant?.state || '') !== 'pending' ||
        String(existingAssistant?.operationNumber || '') !== operationNumber;

      const { data: updated, error: updateError } = await admin
        .from('assistants')
        .update({
          operationNumber,
          state: 'pending',
        })
        .eq('id', existingAssistant.id)
        .select('id')
        .single();

      if (updateError) {
        log.database('UPDATE assistants for payment confirm', 'assistants', updateError, {
          assistantId: existingAssistant.id,
          eventId,
          userId: user.id,
        });
        return NextResponse.json({ error: 'No se pudo actualizar la inscripción.' }, { status: 500 });
      }

      if (shouldNotifyPending) {
        await Promise.all([
          sendPaymentStatusEmail({
            status: 'pending',
            toEmail: String(user.email || ''),
            toName: String(user.user_metadata?.username || user.user_metadata?.name || '').trim() || null,
            baseUrl: requestOrigin,
            eventTitle: String((eventRow as any)?.title || ''),
            eventStartTime: String((eventRow as any)?.start_time || ''),
            eventLocation: String((eventRow as any)?.location_text || ''),
            ticketsUrl: `${requestOrigin || ''}/tickets/${user.id}`,
          }),
          notifyEventAdminPendingPayment({
            admin,
            baseUrl: requestOrigin,
            eventRow: eventRow as Record<string, any>,
            participantUser: {
              id: user.id,
              email: user.email,
              user_metadata: user.user_metadata as Record<string, any> | undefined,
            },
            operationNumber,
          }),
        ]);
      }

      return NextResponse.json({ ok: true, assistantId: updated.id }, { status: 200 });
    }

    const { data: inserted, error: insertError } = await admin
      .from('assistants')
      .insert({
        operationNumber,
        event: eventId,
        user: user.id,
        state: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      log.database('INSERT assistants for payment confirm', 'assistants', insertError, {
        eventId,
        userId: user.id,
      });
      return NextResponse.json({ error: 'No se pudo registrar la inscripción.' }, { status: 500 });
    }

    await Promise.all([
      sendPaymentStatusEmail({
        status: 'pending',
        toEmail: String(user.email || ''),
        toName: String(user.user_metadata?.username || user.user_metadata?.name || '').trim() || null,
        baseUrl: requestOrigin,
        eventTitle: String((eventRow as any)?.title || ''),
        eventStartTime: String((eventRow as any)?.start_time || ''),
        eventLocation: String((eventRow as any)?.location_text || ''),
        ticketsUrl: `${requestOrigin || ''}/tickets/${user.id}`,
      }),
      notifyEventAdminPendingPayment({
        admin,
        baseUrl: requestOrigin,
        eventRow: eventRow as Record<string, any>,
        participantUser: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata as Record<string, any> | undefined,
        },
        operationNumber,
      }),
    ]);

    return NextResponse.json({ ok: true, assistantId: inserted.id }, { status: 200 });
  } catch (error: any) {
    log.error('Payment confirm failed', 'PAYMENTS', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo confirmar el pago.' },
      { status: 500 }
    );
  }
}
