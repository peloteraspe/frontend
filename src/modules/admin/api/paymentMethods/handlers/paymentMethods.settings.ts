import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { isAdmin } from '@shared/lib/auth/isAdmin';

type SavePaymentMethodPayload = {
  id?: string | number;
  name?: string;
  qr?: string;
  number?: string | number;
  allowYape?: boolean;
  allowPlin?: boolean;
  isActive?: boolean;
};

type PaymentMethodRow = {
  id: number;
  created_at: string;
  updated_at: string;
  name: string | null;
  QR: string | null;
  number: number | null;
  type: string | null;
  is_active: boolean | null;
};

function normalizeDigits(raw: string | number | undefined) {
  return String(raw ?? '')
    .trim()
    .replace(/\D+/g, '');
}

function parseTypeFromFlags(allowYape: boolean, allowPlin: boolean) {
  if (allowYape && allowPlin) return 'yape_plin';
  if (allowYape) return 'yape';
  if (allowPlin) return 'plin';
  return null;
}

function typeLabel(type: string) {
  if (type === 'yape_plin') return 'Yape/Plin';
  if (type === 'plin') return 'Plin';
  return 'Yape';
}

async function requireAdminUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errorResponse: NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 }) };
  }

  if (!isAdmin(user)) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Solo admins pueden administrar métodos de pago.' },
        { status: 403 }
      ),
    };
  }

  return { user, supabase };
}

async function loadPaymentMethods(supabase: Awaited<ReturnType<typeof getServerSupabase>>) {
  const { data, error } = await supabase
    .from('paymentMethod')
    .select('id,created_at,updated_at,name,QR,number,type,is_active')
    .order('is_active', { ascending: false })
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    log.database('SELECT admin payment methods', 'paymentMethod', error);
    throw new Error('No se pudieron obtener los métodos de pago.');
  }

  return (data || []) as PaymentMethodRow[];
}

export async function GET() {
  try {
    const auth = await requireAdminUser();
    if ('errorResponse' in auth) return auth.errorResponse;

    const paymentMethods = await loadPaymentMethods(auth.supabase);
    return NextResponse.json({ ok: true, paymentMethods });
  } catch (error: any) {
    log.error('Error fetching payment methods admin settings', 'ADMIN_PAYMENT_METHODS', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudieron obtener los métodos de pago.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminUser();
    if ('errorResponse' in auth) return auth.errorResponse;

    const body = (await request.json().catch(() => ({}))) as SavePaymentMethodPayload;
    const methodId = Number(body?.id);
    const isEditing = Number.isFinite(methodId) && methodId > 0;

    const allowYape = body?.allowYape === true;
    const allowPlin = body?.allowPlin === true;
    const type = parseTypeFromFlags(allowYape, allowPlin);
    const qr = String(body?.qr || '').trim();
    const numberDigits = normalizeDigits(body?.number);
    const isActive = body?.isActive !== false;

    if (!type) {
      return NextResponse.json(
        { error: 'Debes activar al menos Yape o Plin para definir el tipo.' },
        { status: 400 }
      );
    }

    if (!numberDigits) {
      return NextResponse.json({ error: 'El número de pago es obligatorio.' }, { status: 400 });
    }

    if (numberDigits.length < 8 || numberDigits.length > 15) {
      return NextResponse.json(
        { error: 'El número de pago debe tener entre 8 y 15 dígitos.' },
        { status: 400 }
      );
    }

    if (!qr) {
      return NextResponse.json({ error: 'El QR es obligatorio.' }, { status: 400 });
    }

    const rawName = String(body?.name || '').trim();
    const fallbackName = `${typeLabel(type)} ${numberDigits.slice(-4)}`;
    const name = rawName || fallbackName;
    const now = new Date().toISOString();

    const payload = {
      name,
      QR: qr,
      number: Number(numberDigits),
      type,
      is_active: isActive,
      updated_at: now,
      updated_by: auth.user.id,
    };

    if (isEditing) {
      const { error: updateError } = await auth.supabase
        .from('paymentMethod')
        .update(payload)
        .eq('id', methodId);

      if (updateError) {
        log.database('UPDATE payment method', 'paymentMethod', updateError, { id: methodId });
        throw new Error('No se pudo actualizar el método de pago.');
      }
    } else {
      const { error: insertError } = await auth.supabase.from('paymentMethod').insert({
        ...payload,
        created_by: auth.user.id,
      });

      if (insertError) {
        log.database('INSERT payment method', 'paymentMethod', insertError);
        throw new Error('No se pudo crear el método de pago.');
      }
    }

    const paymentMethods = await loadPaymentMethods(auth.supabase);
    return NextResponse.json({
      ok: true,
      mode: isEditing ? 'updated' : 'created',
      paymentMethods,
    });
  } catch (error: any) {
    log.error('Error saving payment method admin settings', 'ADMIN_PAYMENT_METHODS', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo guardar el método de pago.' },
      { status: 500 }
    );
  }
}
