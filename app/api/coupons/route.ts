import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { log } from '@core/lib/logger';

function getCouponInsertErrorMessage(error: any) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').trim();
  const details = String(error?.details || '').trim();
  const hint = String(error?.hint || '').trim();
  const combined = [message, details, hint].filter(Boolean).join(' ').toLowerCase();

  if (code === '23505') {
    return 'Ya existe un cupón con este código.';
  }

  if (combined.includes('coupon_company_requires_name')) {
    return 'Debes ingresar el nombre de la empresa.';
  }

  if (combined.includes('coupon_individual_requires_email')) {
    return 'Debes ingresar el email de la jugadora.';
  }

  if (combined.includes('discount_amount')) {
    return 'El monto de descuento debe ser mayor a 0.';
  }

  if (combined.includes('max_uses')) {
    return 'El máximo de usos debe ser mayor a 0.';
  }

  if (combined.includes('event_id') || combined.includes('coupon_event_id')) {
    return 'El evento seleccionado no es válido.';
  }

  if (combined.includes('relation') && combined.includes('coupon')) {
    return 'La tabla de cupones no existe todavía. Ejecuta la migración del sistema de cupones.';
  }

  if (message) {
    return `No se pudo crear el cupón: ${message}`;
  }

  return 'No se pudo crear el cupón.';
}

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

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireSuperAdmin();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const isActive = searchParams.get('active');
    const type = searchParams.get('type');

    const admin = getAdminSupabase();
    let query = admin
      .from('coupon')
      .select('*')
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', Number(eventId));
    }

    if (isActive === 'true') {
      query = query.eq('is_active', true);
    } else if (isActive === 'false') {
      query = query.eq('is_active', false);
    }

    if (type === 'company' || type === 'individual') {
      query = query.eq('type', type);
    }

    const { data: coupons, error: queryError } = await query;

    if (queryError) {
      log.database('SELECT coupons list', 'coupon', queryError);
      return NextResponse.json({ error: 'No se pudieron obtener los cupones.' }, { status: 500 });
    }

    return NextResponse.json({ coupons: coupons || [] });
  } catch (error: any) {
    log.error('List coupons failed', 'COUPONS', error);
    return NextResponse.json({ error: 'Error al listar cupones.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireSuperAdmin();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const code = String(body?.code || '').trim().toUpperCase();
    const discountAmount = Number(body?.discountAmount);
    const eventId = body?.eventId ? Number(body.eventId) : null;
    const type = String(body?.type || '').trim();
    const companyName = body?.companyName ? String(body.companyName).trim() : null;
    const assignedEmail = body?.assignedEmail ? String(body.assignedEmail).trim().toLowerCase() : null;
    const maxUses = Number(body?.maxUses);
    const expiresAt = body?.expiresAt ? String(body.expiresAt) : null;

    // Validations
    if (!code || code.length < 3) {
      return NextResponse.json({ error: 'El código debe tener al menos 3 caracteres.' }, { status: 400 });
    }

    if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
      return NextResponse.json({ error: 'El monto de descuento debe ser mayor a 0.' }, { status: 400 });
    }

    if (type !== 'company' && type !== 'individual') {
      return NextResponse.json({ error: 'El tipo debe ser "company" o "individual".' }, { status: 400 });
    }

    if (type === 'company' && !companyName) {
      return NextResponse.json({ error: 'Debes ingresar el nombre de la empresa.' }, { status: 400 });
    }

    if (type === 'individual' && !assignedEmail) {
      return NextResponse.json({ error: 'Debes ingresar el email de la jugadora.' }, { status: 400 });
    }

    const resolvedMaxUses = type === 'individual' ? 1 : maxUses;
    if (!Number.isFinite(resolvedMaxUses) || resolvedMaxUses <= 0) {
      return NextResponse.json({ error: 'El máximo de usos debe ser mayor a 0.' }, { status: 400 });
    }

    const admin = getAdminSupabase();

    if (eventId !== null && (!Number.isInteger(eventId) || eventId <= 0)) {
      return NextResponse.json({ error: 'Selecciona un evento válido.' }, { status: 400 });
    }

    if (eventId !== null) {
      const { data: eventRecord, error: eventError } = await admin
        .from('event')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();

      if (eventError) {
        log.database('SELECT coupon event', 'event', eventError, { eventId });
        return NextResponse.json({ error: 'No se pudo validar el evento seleccionado.' }, { status: 500 });
      }

      if (!eventRecord) {
        return NextResponse.json({ error: 'El evento seleccionado no existe.' }, { status: 400 });
      }
    }

    // Check for duplicate code
    const { data: existing } = await admin
      .from('coupon')
      .select('id')
      .ilike('code', code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un cupón con este código.' }, { status: 409 });
    }

    const { data: coupon, error: insertError } = await admin
      .from('coupon')
      .insert({
        code,
        discount_amount: discountAmount,
        event_id: eventId,
        type,
        company_name: companyName,
        assigned_email: assignedEmail,
        max_uses: resolvedMaxUses,
        expires_at: expiresAt,
        created_by: user!.id,
      })
      .select('*')
      .single();

    if (insertError) {
      const errorData = {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      };

      log.database('INSERT coupon', 'coupon', insertError as any, errorData);
      return NextResponse.json({ error: getCouponInsertErrorMessage(insertError) }, { status: 500 });
    }

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error: any) {
    log.error('Create coupon failed', 'COUPONS', error);
    return NextResponse.json({ error: 'Error al crear cupón.' }, { status: 500 });
  }
}
