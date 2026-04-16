import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { log } from '@core/lib/logger';
import {
  canMarkCouponReimbursementSent,
  canRequestCouponReimbursement,
  couponReimbursementStatuses,
  normalizeCouponReimbursementStatus,
} from '@modules/payments/lib/couponReimbursement';
import {
  sendCouponReimbursementRequestEmail,
  sendOrganizerCouponTransferSentEmail,
} from '@modules/payments/api/services/payment-status-email.service';

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

type RedemptionRow = {
  id: number;
  coupon_id: number;
  user_id: string;
  event_id: number;
  assistant_id: number | null;
  discount_applied: number;
  organizer_user_id: string;
  reimbursement_status: string | null;
  reimbursed_at: string | null;
  redeemed_at: string;
};

function parseOptionalEventId(value: string | null) {
  if (!value) return null;
  const eventId = Number(value);
  return Number.isFinite(eventId) && eventId > 0 ? eventId : null;
}

function parseRequestedStatus(value: string | null) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;

  if (raw === 'pending') return 'requested';
  if (raw === 'deposited') return 'confirmed';

  return couponReimbursementStatuses.includes(raw as (typeof couponReimbursementStatuses)[number])
    ? (raw as (typeof couponReimbursementStatuses)[number])
    : null;
}

async function requireAuthenticatedUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }),
    };
  }

  return {
    user: user as AuthenticatedUser,
    errorResponse: null,
  };
}

async function loadProfileName(admin: ReturnType<typeof getAdminSupabase>, userId: string) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return '';

  const { data, error } = await admin
    .from('profile')
    .select('username')
    .eq('user', normalizedUserId)
    .maybeSingle();

  if (error) {
    log.database('SELECT profile for coupon reimbursement', 'profile', error, { userId: normalizedUserId });
    return '';
  }

  return String((data as any)?.username || '').trim();
}

async function loadAuthEmail(admin: ReturnType<typeof getAdminSupabase>, userId: string) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return '';

  try {
    const { data, error } = await admin.auth.admin.getUserById(normalizedUserId);
    if (error) {
      log.warn('Could not load auth email for coupon reimbursement', 'COUPONS', {
        userId: normalizedUserId,
        error,
      });
      return '';
    }

    return String(data?.user?.email || '').trim();
  } catch (error) {
    log.error('Auth email lookup failed for coupon reimbursement', 'COUPONS', error, {
      userId: normalizedUserId,
    });
    return '';
  }
}

async function loadRedemptionContext(admin: ReturnType<typeof getAdminSupabase>, redemption: RedemptionRow) {
  const [{ data: coupon }, { data: event }, playerName, playerEmail, organizerName, organizerEmail] =
    await Promise.all([
      admin.from('coupon').select('id,code').eq('id', redemption.coupon_id).maybeSingle(),
      admin
        .from('event')
        .select('id,title,start_time,location_text')
        .eq('id', redemption.event_id)
        .maybeSingle(),
      loadProfileName(admin, redemption.user_id),
      loadAuthEmail(admin, redemption.user_id),
      loadProfileName(admin, redemption.organizer_user_id),
      loadAuthEmail(admin, redemption.organizer_user_id),
    ]);

  return {
    couponCode: String((coupon as any)?.code || '').trim(),
    eventId: Number((event as any)?.id || redemption.event_id) || redemption.event_id,
    eventTitle: String((event as any)?.title || '').trim(),
    eventStartTime: String((event as any)?.start_time || '').trim(),
    eventLocation: String((event as any)?.location_text || '').trim(),
    playerName,
    playerEmail,
    organizerName,
    organizerEmail,
  };
}

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    if (!isSuperAdmin(user as any)) {
      return NextResponse.json({ error: 'Solo superadmins pueden ver reembolsos.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = parseOptionalEventId(searchParams.get('eventId'));
    const status = parseRequestedStatus(searchParams.get('status'));
    const admin = getAdminSupabase();

    let query = admin
      .from('coupon_redemption')
      .select('*')
      .order('redeemed_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (status) {
      query = query.eq('reimbursement_status', status);
    }

    const { data: rawRedemptions, error: queryError } = await query.limit(200);

    if (queryError) {
      log.database('SELECT coupon_redemptions for reimbursements', 'coupon_redemption', queryError, {
        eventId,
        status,
      });
      return NextResponse.json({ error: 'No se pudieron obtener los reembolsos.' }, { status: 500 });
    }

    const redemptions = ((rawRedemptions as RedemptionRow[] | null) ?? []).map((redemption) => ({
      ...redemption,
      reimbursement_status: normalizeCouponReimbursementStatus(redemption.reimbursement_status),
    }));

    if (redemptions.length === 0) {
      return NextResponse.json({ redemptions: [] });
    }

    const couponIds = Array.from(new Set(redemptions.map((redemption) => redemption.coupon_id).filter(Boolean)));
    const eventIds = Array.from(new Set(redemptions.map((redemption) => redemption.event_id).filter(Boolean)));
    const userIds = Array.from(
      new Set(
        redemptions
          .flatMap((redemption) => [redemption.user_id, redemption.organizer_user_id])
          .filter((userId) => String(userId || '').trim())
      )
    );

    const [couponsResult, eventsResult, profilesResult, authResults] = await Promise.all([
      couponIds.length
        ? admin.from('coupon').select('id,code').in('id', couponIds)
        : Promise.resolve({ data: [] }),
      eventIds.length
        ? admin.from('event').select('id,title').in('id', eventIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? admin.from('profile').select('user,username').in('user', userIds)
        : Promise.resolve({ data: [] }),
      Promise.all(
        userIds.map(async (userId) => ({
          userId,
          email: await loadAuthEmail(admin, userId),
        }))
      ),
    ]);

    const couponMap = new Map<number, string>();
    ((couponsResult as any)?.data || []).forEach((coupon: any) => {
      couponMap.set(Number(coupon.id), String(coupon.code || '').trim());
    });

    const eventMap = new Map<number, string>();
    ((eventsResult as any)?.data || []).forEach((event: any) => {
      eventMap.set(Number(event.id), String(event.title || '').trim());
    });

    const profileMap = new Map<string, string>();
    ((profilesResult as any)?.data || []).forEach((profile: any) => {
      profileMap.set(String(profile.user), String(profile.username || '').trim());
    });

    const emailMap = new Map<string, string>();
    authResults.forEach((result) => {
      emailMap.set(String(result.userId), String(result.email || '').trim());
    });

    const enriched = redemptions.map((redemption) => ({
      ...redemption,
      coupon_code: couponMap.get(Number(redemption.coupon_id)) || '',
      player_name: profileMap.get(String(redemption.user_id)) || '',
      player_email: emailMap.get(String(redemption.user_id)) || '',
      organizer_name: profileMap.get(String(redemption.organizer_user_id)) || '',
      organizer_email: emailMap.get(String(redemption.organizer_user_id)) || '',
      event_title: eventMap.get(Number(redemption.event_id)) || '',
    }));

    return NextResponse.json({ redemptions: enriched });
  } catch (error: any) {
    log.error('List reimbursements failed', 'COUPONS', error);
    return NextResponse.json({ error: 'Error al listar reembolsos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const redemptionId = Number(body?.redemptionId);
    const action = String(body?.action || '').trim().toLowerCase();

    if (!Number.isFinite(redemptionId) || redemptionId <= 0) {
      return NextResponse.json({ error: 'ID de redención inválido.' }, { status: 400 });
    }

    if (action !== 'request' && action !== 'mark_sent') {
      return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
    }

    const admin = getAdminSupabase();
    const { data: rawRedemption, error: fetchError } = await admin
      .from('coupon_redemption')
      .select('*')
      .eq('id', redemptionId)
      .maybeSingle();

    if (fetchError) {
      log.database('SELECT coupon_redemption for reimburse', 'coupon_redemption', fetchError, { redemptionId });
      return NextResponse.json({ error: 'No se pudo verificar la redención.' }, { status: 500 });
    }

    if (!rawRedemption) {
      return NextResponse.json({ error: 'Redención no encontrada.' }, { status: 404 });
    }

    const redemption = rawRedemption as RedemptionRow;
    const normalizedStatus = normalizeCouponReimbursementStatus(redemption.reimbursement_status);
    const isOrganizer = String(redemption.organizer_user_id || '') === String(user?.id || '');

    if (action === 'request') {
      if (!isOrganizer && !isSuperAdmin(user as any)) {
        return NextResponse.json(
          { error: 'Solo la organizadora o un superadmin pueden solicitar este abono.' },
          { status: 403 }
        );
      }

      if (!canRequestCouponReimbursement(normalizedStatus)) {
        return NextResponse.json(
          { error: 'Este abono ya fue solicitado o ya no puede cambiarse.' },
          { status: 409 }
        );
      }

      const { error: updateError } = await admin
        .from('coupon_redemption')
        .update({
          reimbursement_status: 'requested',
          reimbursement_requested_at: new Date().toISOString(),
          reimbursement_requested_by: user?.id ?? null,
        })
        .eq('id', redemptionId);

      if (updateError) {
        log.database('UPDATE coupon_redemption request', 'coupon_redemption', updateError, { redemptionId });
        return NextResponse.json({ error: 'No se pudo solicitar el abono.' }, { status: 500 });
      }

      const context = await loadRedemptionContext(admin, redemption);
      await sendCouponReimbursementRequestEmail({
        toEmail:
          process.env.COUPON_REIMBURSEMENTS_EMAIL ||
          process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
          'contacto@peloteras.com',
        toName: 'equipo Peloteras',
        baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || null,
        eventId: context.eventId,
        eventTitle: context.eventTitle,
        eventStartTime: context.eventStartTime,
        eventLocation: context.eventLocation,
        participantName: context.playerName,
        participantEmail: context.playerEmail,
        organizerName: context.organizerName,
        couponCode: context.couponCode,
        discountAmount: redemption.discount_applied,
      });

      return NextResponse.json({
        ok: true,
        redemptionId,
        reimbursementStatus: 'requested',
      });
    }

    if (!isSuperAdmin(user as any)) {
      return NextResponse.json({ error: 'Solo superadmins pueden marcar abonos como enviados.' }, { status: 403 });
    }

    if (!canMarkCouponReimbursementSent(normalizedStatus)) {
      return NextResponse.json(
        { error: 'Este abono debe estar solicitado antes de marcarse como enviado.' },
        { status: 409 }
      );
    }

    const { error: updateError } = await admin
      .from('coupon_redemption')
      .update({
        reimbursement_status: 'sent',
        reimbursed_at: new Date().toISOString(),
        reimbursed_by: user?.id ?? null,
      })
      .eq('id', redemptionId);

    if (updateError) {
      log.database('UPDATE coupon_redemption sent', 'coupon_redemption', updateError, { redemptionId });
      return NextResponse.json({ error: 'No se pudo marcar el abono como enviado.' }, { status: 500 });
    }

    const context = await loadRedemptionContext(admin, redemption);
    await sendOrganizerCouponTransferSentEmail({
      toEmail: context.organizerEmail,
      toName: context.organizerName,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || null,
      eventId: context.eventId,
      eventTitle: context.eventTitle,
      eventStartTime: context.eventStartTime,
      eventLocation: context.eventLocation,
      participantName: context.playerName,
      participantEmail: context.playerEmail,
      couponCode: context.couponCode,
      discountAmount: redemption.discount_applied,
    });

    return NextResponse.json({
      ok: true,
      redemptionId,
      reimbursementStatus: 'sent',
    });
  } catch (error: any) {
    log.error('Reimburse coupon failed', 'COUPONS', error);
    return NextResponse.json({ error: 'Error al actualizar el abono.' }, { status: 500 });
  }
}
