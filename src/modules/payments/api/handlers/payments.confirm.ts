import { NextResponse } from 'next/server';
import { hasEventEnded } from '@modules/events/lib/eventTiming';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import { getApprovedParticipantsCountByEventId } from '@modules/events/api/queries/getApprovedParticipantsCount';
import {
  EVENT_SOLD_OUT_MESSAGE,
  isEventSoldOut,
  isEventSoldOutError,
} from '@modules/events/lib/eventCapacity';
import {
  EVENT_ALREADY_APPROVED_REGISTRATION_MESSAGE,
  EVENT_PENDING_REGISTRATION_MESSAGE,
} from '@modules/events/lib/eventJoinState';
import { getViewerRegistrationState } from '@modules/events/api/queries/getViewerApprovedRegistrations';
import {
  sendAdminPaymentPendingReviewEmail,
  sendPaymentStatusEmail,
} from '../services/payment-status-email.service';
import {
  shouldBlockCouponReuse,
  type CouponReimbursementStatus,
} from '@modules/payments/lib/couponReimbursement';

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
  operationNumber?: string | null;
  couponCode?: string | null;
  couponDiscount?: number | null;
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
      couponCode: params.couponCode,
      couponDiscount: params.couponDiscount,
      requiresPeloterasRequest: Number(params.couponDiscount ?? 0) > 0,
    });
  } catch (error) {
    log.error('Admin pending payment email dispatch failed', 'EMAIL', error, {
      eventId: params.eventRow?.id ?? null,
      participantUserId: params.participantUser.id,
    });
  }
}

// ─── Coupon helpers ─────────────────────────────────────────────────────────────

type CouponRow = {
  id: number;
  code: string;
  discount_amount: number;
  event_id: number | null;
  type: string;
  assigned_email: string | null;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
};

/**
 * Validates a coupon code server-side and returns the coupon row if valid.
 * Returns null if no coupon code was provided.
 * Throws an object with { error, status } if validation fails.
 */
async function validateCouponForPayment(params: {
  admin: ReturnType<typeof getAdminSupabase>;
  couponCode: string | null;
  eventId: number;
  userId: string;
  userEmail: string;
}): Promise<CouponRow | null> {
  if (!params.couponCode) return null;

  const code = params.couponCode.trim().toUpperCase();
  if (!code) return null;

  const { data: coupon, error: couponError } = await params.admin
    .from('coupon')
    .select('id,code,discount_amount,event_id,type,assigned_email,max_uses,current_uses,is_active,expires_at')
    .ilike('code', code)
    .maybeSingle();

  if (couponError) {
    log.database('SELECT coupon for payment confirm', 'coupon', couponError, { code });
    throw { error: 'No se pudo validar el cupón.', status: 500 };
  }

  if (!coupon) throw { error: 'Código de cupón no encontrado.', status: 400 };
  if (!coupon.is_active) throw { error: 'Este cupón está desactivado.', status: 400 };

  if (coupon.expires_at) {
    const expiresAt = new Date(String(coupon.expires_at));
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      throw { error: 'Este cupón ha expirado.', status: 400 };
    }
  }

  if (coupon.current_uses >= coupon.max_uses) {
    throw { error: 'Este cupón ya alcanzó su límite de usos.', status: 400 };
  }

  if (coupon.event_id !== null && Number(coupon.event_id) !== params.eventId) {
    throw { error: 'Este cupón no es válido para este evento.', status: 400 };
  }

  if (coupon.type === 'individual') {
    const userEmail = params.userEmail.trim().toLowerCase();
    const assignedEmail = String(coupon.assigned_email || '').trim().toLowerCase();
    if (!userEmail || userEmail !== assignedEmail) {
      throw { error: 'Este cupón no está asignado a tu cuenta.', status: 403 };
    }
  }

  const { data: existingRedemption } = await params.admin
    .from('coupon_redemption')
    .select('id,reimbursement_status')
    .eq('coupon_id', coupon.id)
    .eq('user_id', params.userId)
    .eq('event_id', params.eventId)
    .maybeSingle();

  if (
    existingRedemption &&
    shouldBlockCouponReuse((existingRedemption as { reimbursement_status?: CouponReimbursementStatus | string | null }).reimbursement_status)
  ) {
    throw { error: 'Ya usaste este cupón para este evento.', status: 400 };
  }

  return coupon as CouponRow;
}

/**
 * Records coupon redemption and increments usage counter.
 */
async function recordCouponRedemption(params: {
  admin: ReturnType<typeof getAdminSupabase>;
  couponId: number;
  userId: string;
  eventId: number;
  assistantId: number;
  discountApplied: number;
  organizerUserId: string;
}) {
  const redemptionPayload = {
    coupon_id: params.couponId,
    user_id: params.userId,
    event_id: params.eventId,
    assistant_id: params.assistantId,
    discount_applied: params.discountApplied,
    organizer_user_id: params.organizerUserId,
    reimbursement_status: 'not_requested',
    reimbursement_requested_at: null,
    reimbursement_requested_by: null,
    reimbursed_at: null,
    reimbursed_by: null,
    organizer_confirmed_at: null,
    organizer_confirmed_by: null,
  };

  const { data: existingRedemption, error: existingRedemptionError } = await params.admin
    .from('coupon_redemption')
    .select('id,reimbursement_status')
    .eq('coupon_id', params.couponId)
    .eq('user_id', params.userId)
    .eq('event_id', params.eventId)
    .maybeSingle();

  if (existingRedemptionError) {
    log.database('SELECT coupon_redemption before insert', 'coupon_redemption', existingRedemptionError, {
      couponId: params.couponId,
      userId: params.userId,
      eventId: params.eventId,
    });
    return;
  }

  if (existingRedemption) {
    if (shouldBlockCouponReuse(existingRedemption.reimbursement_status)) {
      log.warn('Skipping coupon_redemption insert because active redemption already exists', 'PAYMENTS', {
        couponId: params.couponId,
        userId: params.userId,
        eventId: params.eventId,
        redemptionId: existingRedemption.id,
      });
      return;
    }

    const { error: redemptionUpdateError } = await params.admin
      .from('coupon_redemption')
      .update({
        ...redemptionPayload,
        redeemed_at: new Date().toISOString(),
      })
      .eq('id', existingRedemption.id);

    if (redemptionUpdateError) {
      log.database('UPDATE canceled coupon_redemption', 'coupon_redemption', redemptionUpdateError, {
        couponId: params.couponId,
        userId: params.userId,
        eventId: params.eventId,
        redemptionId: existingRedemption.id,
      });
      return;
    }
  } else {
    const { error: redemptionError } = await params.admin.from('coupon_redemption').insert(redemptionPayload);

    if (redemptionError) {
      log.database('INSERT coupon_redemption', 'coupon_redemption', redemptionError, {
        couponId: params.couponId,
        userId: params.userId,
        eventId: params.eventId,
      });
      return;
    }
  }

  // Increment current_uses on the coupon
  const { data: currentCoupon } = await params.admin
    .from('coupon')
    .select('current_uses')
    .eq('id', params.couponId)
    .single();

  if (currentCoupon) {
    await params.admin
      .from('coupon')
      .update({ current_uses: (currentCoupon.current_uses || 0) + 1 })
      .eq('id', params.couponId);
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────────

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
    const couponCode = body?.couponCode ? String(body.couponCode).trim() : null;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId inválido.' }, { status: 400 });
    }

    const admin = getAdminSupabase();
    const requestOrigin = resolveRequestOrigin(request);

    const { data: eventRow, error: eventError } = await admin
      .from('event')
      .select('id,start_time,end_time,title,location_text,is_published,created_by,created_by_id,max_users,price')
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

    if (hasEventEnded(String(eventRow?.end_time || ''), undefined, String(eventRow?.start_time || ''))) {
      return NextResponse.json(
        { error: 'Este evento ya finalizó. La inscripción está cerrada.' },
        { status: 409 }
      );
    }

    const viewerRegistrationState = await getViewerRegistrationState(eventId, admin, user.id);

    if (viewerRegistrationState === 'approved') {
      return NextResponse.json(
        {
          error: EVENT_ALREADY_APPROVED_REGISTRATION_MESSAGE,
          code: 'ALREADY_REGISTERED',
        },
        { status: 409 }
      );
    }

    if (viewerRegistrationState === 'pending') {
      return NextResponse.json(
        {
          error: EVENT_PENDING_REGISTRATION_MESSAGE,
          code: 'PAYMENT_PENDING_REVIEW',
        },
        { status: 409 }
      );
    }

    // ── Validate coupon if provided ──
    let validatedCoupon: CouponRow | null = null;
    const eventPrice = Number((eventRow as any)?.price ?? 0);

    if (couponCode) {
      try {
        validatedCoupon = await validateCouponForPayment({
          admin,
          couponCode,
          eventId,
          userId: user.id,
          userEmail: String(user.email || ''),
        });
      } catch (couponErr: any) {
        if (couponErr?.error && couponErr?.status) {
          return NextResponse.json({ error: couponErr.error }, { status: couponErr.status });
        }
        throw couponErr;
      }
    }

    const discountAmount = validatedCoupon ? Number(validatedCoupon.discount_amount) : 0;
    const remainingAmount = Math.max(eventPrice - discountAmount, 0);
    const isFullyCoveredByCoupon = validatedCoupon !== null && remainingAmount <= 0;

    // If no coupon covering full price, operationNumber is required
    if (!isFullyCoveredByCoupon && !operationNumber) {
      return NextResponse.json({ error: 'Número de operación inválido.' }, { status: 400 });
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

    const approvedCount = await getApprovedParticipantsCountByEventId(eventId, admin);
    if (isEventSoldOut((eventRow as any)?.max_users, approvedCount)) {
      return NextResponse.json({ error: EVENT_SOLD_OUT_MESSAGE }, { status: 409 });
    }

    const organizerUserId = String((eventRow as any)?.created_by_id || '').trim();
    const assistantState = 'pending';
    const effectiveDiscountApplied = validatedCoupon ? Math.min(discountAmount, eventPrice) : 0;

    // Helper to build email params
    const emailBaseParams = {
      toEmail: String(user.email || ''),
      toName: String(user.user_metadata?.username || user.user_metadata?.name || '').trim() || null,
      baseUrl: requestOrigin,
      eventTitle: String((eventRow as any)?.title || ''),
      eventStartTime: String((eventRow as any)?.start_time || ''),
      eventLocation: String((eventRow as any)?.location_text || ''),
      ticketsUrl: `${requestOrigin || ''}/tickets/${user.id}`,
    };

    // ── Upsert or insert assistant record ──
    let assistantId: number;

    if (existingAssistant?.id) {
      const { data: updated, error: updateError } = await admin
        .from('assistants')
        .update({
          operationNumber: isFullyCoveredByCoupon ? null : operationNumber,
          state: assistantState,
        })
        .eq('id', existingAssistant.id)
        .select('id')
        .single();

      if (updateError) {
        if (isEventSoldOutError(updateError)) {
          return NextResponse.json({ error: EVENT_SOLD_OUT_MESSAGE }, { status: 409 });
        }
        log.database('UPDATE assistants for payment confirm', 'assistants', updateError, {
          assistantId: existingAssistant.id,
          eventId,
          userId: user.id,
        });
        return NextResponse.json({ error: 'No se pudo actualizar la inscripción.' }, { status: 500 });
      }

      assistantId = updated.id;
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('assistants')
        .insert({
          operationNumber: isFullyCoveredByCoupon ? null : operationNumber,
          event: eventId,
          user: user.id,
          state: assistantState,
        })
        .select('id')
        .single();

      if (insertError) {
        if (isEventSoldOutError(insertError)) {
          return NextResponse.json({ error: EVENT_SOLD_OUT_MESSAGE }, { status: 409 });
        }
        log.database('INSERT assistants for payment confirm', 'assistants', insertError, {
          eventId,
          userId: user.id,
        });
        return NextResponse.json({ error: 'No se pudo registrar la inscripción.' }, { status: 500 });
      }

      assistantId = inserted.id;
    }

    // ── Record coupon redemption ──
    if (validatedCoupon) {
      await recordCouponRedemption({
        admin,
        couponId: validatedCoupon.id,
        userId: user.id,
        eventId,
        assistantId,
        discountApplied: effectiveDiscountApplied,
        organizerUserId,
      });
    }

    // ── Send notifications ──
    const participantUser = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata as Record<string, any> | undefined,
    };
    const notificationPromises = [
      sendPaymentStatusEmail({
        status: validatedCoupon ? 'coupon_pending' : 'pending',
        ...emailBaseParams,
      }),
      notifyEventAdminPendingPayment({
        admin,
        baseUrl: requestOrigin,
        eventRow: eventRow as Record<string, any>,
        participantUser,
        operationNumber: operationNumber ?? null,
        couponCode: validatedCoupon?.code ?? null,
        couponDiscount: validatedCoupon ? effectiveDiscountApplied : null,
      }),
    ];

    await Promise.all(notificationPromises);

    return NextResponse.json({
      ok: true,
      assistantId,
      couponApplied: !!validatedCoupon,
      discountAmount: effectiveDiscountApplied,
      autoApproved: false,
    }, { status: 200 });
  } catch (error: any) {
    log.error('Payment confirm failed', 'PAYMENTS', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo confirmar el pago.' },
      { status: 500 }
    );
  }
}
