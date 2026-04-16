import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import { shouldBlockCouponReuse } from '@modules/payments/lib/couponReimbursement';

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
    const code = String(body?.code || '').trim().toUpperCase();
    const eventId = Number(body?.eventId);

    if (!code) {
      return NextResponse.json({ error: 'Ingresa un código de cupón.' }, { status: 400 });
    }

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
    }

    const admin = getAdminSupabase();

    // 1. Find coupon by code (case-insensitive)
    const { data: coupon, error: couponError } = await admin
      .from('coupon')
      .select('id,code,discount_amount,event_id,type,assigned_email,max_uses,current_uses,is_active,expires_at')
      .ilike('code', code)
      .maybeSingle();

    if (couponError) {
      log.database('SELECT coupon for validation', 'coupon', couponError, { code, eventId });
      return NextResponse.json({ error: 'No se pudo validar el cupón.' }, { status: 500 });
    }

    if (!coupon) {
      return NextResponse.json({ error: 'Código de cupón no encontrado.' }, { status: 404 });
    }

    // 2. Check active
    if (!coupon.is_active) {
      return NextResponse.json({ error: 'Este cupón está desactivado.' }, { status: 400 });
    }

    // 3. Check expiration
    if (coupon.expires_at) {
      const expiresAt = new Date(String(coupon.expires_at));
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'Este cupón ha expirado.' }, { status: 400 });
      }
    }

    // 4. Check usage limit
    if (coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json({ error: 'Este cupón ya alcanzó su límite de usos.' }, { status: 400 });
    }

    // 5. Check event scope
    if (coupon.event_id !== null && Number(coupon.event_id) !== eventId) {
      return NextResponse.json({ error: 'Este cupón no es válido para este evento.' }, { status: 400 });
    }

    // 6. Check individual assignment
    if (coupon.type === 'individual') {
      const userEmail = String(user.email || '').trim().toLowerCase();
      const assignedEmail = String(coupon.assigned_email || '').trim().toLowerCase();
      if (!userEmail || userEmail !== assignedEmail) {
        return NextResponse.json({ error: 'Este cupón no está asignado a tu cuenta.' }, { status: 403 });
      }
    }

    // 7. Check if user already redeemed this coupon for this event
    const { data: existingRedemption, error: redemptionError } = await admin
      .from('coupon_redemption')
      .select('id,reimbursement_status')
      .eq('coupon_id', coupon.id)
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .maybeSingle();

    if (redemptionError) {
      log.database('SELECT coupon_redemption for validation', 'coupon_redemption', redemptionError, {
        couponId: coupon.id,
        userId: user.id,
        eventId,
      });
      return NextResponse.json({ error: 'No se pudo validar el cupón.' }, { status: 500 });
    }

    if (
      existingRedemption &&
      shouldBlockCouponReuse(existingRedemption.reimbursement_status)
    ) {
      return NextResponse.json({ error: 'Ya usaste este cupón para este evento.' }, { status: 400 });
    }

    // All validations passed
    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountAmount: Number(coupon.discount_amount),
    });
  } catch (error: any) {
    log.error('Coupon validation failed', 'COUPONS', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo validar el cupón.' },
      { status: 500 }
    );
  }
}
