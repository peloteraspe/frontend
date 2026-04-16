import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { log } from '@core/lib/logger';

async function requireSuperAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, errorResponse: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }) };
  }

  if (!isSuperAdmin(user)) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Solo superadmins pueden gestionar cupones.' }, { status: 403 }),
    };
  }

  return { user, errorResponse: null };
}

function parseCouponId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { errorResponse } = await requireSuperAdmin();
    if (errorResponse) return errorResponse;

    const resolvedParams = await params;
    const couponId = parseCouponId(resolvedParams);
    if (!couponId) {
      return NextResponse.json({ error: 'ID de cupón inválido.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, any> = {};

    if (typeof body?.is_active === 'boolean') {
      updates.is_active = body.is_active;
    }

    if (typeof body?.max_uses === 'number' && body.max_uses > 0) {
      updates.max_uses = body.max_uses;
    }

    if (typeof body?.discount_amount === 'number' && body.discount_amount > 0) {
      updates.discount_amount = body.discount_amount;
    }

    if (typeof body?.expires_at === 'string') {
      updates.expires_at = body.expires_at || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar.' }, { status: 400 });
    }

    const admin = getAdminSupabase();

    const { data: coupon, error: updateError } = await admin
      .from('coupon')
      .update(updates)
      .eq('id', couponId)
      .select('*')
      .single();

    if (updateError) {
      log.database('UPDATE coupon', 'coupon', updateError, { couponId });
      return NextResponse.json({ error: 'No se pudo actualizar el cupón.' }, { status: 500 });
    }

    return NextResponse.json({ coupon });
  } catch (error: any) {
    log.error('Update coupon failed', 'COUPONS', error);
    return NextResponse.json({ error: 'Error al actualizar cupón.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { errorResponse } = await requireSuperAdmin();
    if (errorResponse) return errorResponse;

    const resolvedParams = await params;
    const couponId = parseCouponId(resolvedParams);
    if (!couponId) {
      return NextResponse.json({ error: 'ID de cupón inválido.' }, { status: 400 });
    }

    const admin = getAdminSupabase();

    // Check if coupon has been used
    const { count } = await admin
      .from('coupon_redemption')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', couponId);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un cupón que ya fue usado. Desactívalo en su lugar.' },
        { status: 409 }
      );
    }

    const { error: deleteError } = await admin.from('coupon').delete().eq('id', couponId);

    if (deleteError) {
      log.database('DELETE coupon', 'coupon', deleteError, { couponId });
      return NextResponse.json({ error: 'No se pudo eliminar el cupón.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    log.error('Delete coupon failed', 'COUPONS', error);
    return NextResponse.json({ error: 'Error al eliminar cupón.' }, { status: 500 });
  }
}
