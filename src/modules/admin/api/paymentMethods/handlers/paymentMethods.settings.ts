import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { isAdmin } from '@shared/lib/auth/isAdmin';

const PAYMENT_METHOD_QR_BUCKET = process.env.NEXT_PUBLIC_PAYMENT_METHODS_BUCKET || 'payment-methods';
const MAX_QR_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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

function normalizeTextField(raw: FormDataEntryValue | null) {
  return typeof raw === 'string' ? raw.trim() : '';
}

function normalizeBooleanField(raw: FormDataEntryValue | null) {
  if (typeof raw !== 'string') return false;
  const value = raw.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'on';
}

function resolveFileExtension(file: File) {
  const fromName = file.name.split('.').pop()?.trim().toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  const mime = file.type.trim().toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'png';
}

async function ensureQrBucket() {
  const adminSupabase = getAdminSupabase();
  const { data: bucket } = await adminSupabase.storage.getBucket(PAYMENT_METHOD_QR_BUCKET);

  if (bucket) {
    if (!bucket.public) {
      const { error: updateBucketError } = await adminSupabase.storage.updateBucket(
        PAYMENT_METHOD_QR_BUCKET,
        { public: true }
      );
      if (updateBucketError) {
        log.database('UPDATE payment qr bucket visibility', 'storage.buckets', updateBucketError);
        throw new Error('No se pudo preparar el almacenamiento de imágenes.');
      }
    }
    return adminSupabase;
  }

  const { error: createBucketError } = await adminSupabase.storage.createBucket(PAYMENT_METHOD_QR_BUCKET, {
    public: true,
    fileSizeLimit: '5MB',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
  });

  if (createBucketError) {
    const bucketAlreadyExists =
      String((createBucketError as any)?.message || '')
        .trim()
        .toLowerCase()
        .includes('already exists') || Number((createBucketError as any)?.statusCode) === 409;

    if (!bucketAlreadyExists) {
      log.database('CREATE payment qr bucket', 'storage.buckets', createBucketError);
      throw new Error('No se pudo preparar el almacenamiento de imágenes.');
    }
  }

  return adminSupabase;
}

async function uploadQrImage(file: File, userId: string) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo se permiten imágenes para el QR.');
  }

  if (!file.size) {
    throw new Error('El archivo QR está vacío.');
  }

  if (file.size > MAX_QR_IMAGE_SIZE_BYTES) {
    throw new Error('La imagen QR no puede superar 5MB.');
  }

  const adminSupabase = await ensureQrBucket();
  const extension = resolveFileExtension(file);
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await adminSupabase.storage.from(PAYMENT_METHOD_QR_BUCKET).upload(path, bytes, {
    contentType: file.type || `image/${extension}`,
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    log.database('UPLOAD payment qr image', 'storage.objects', uploadError, { bucket: PAYMENT_METHOD_QR_BUCKET });
    throw new Error('No se pudo subir la imagen QR.');
  }

  const { data: publicData } = adminSupabase.storage.from(PAYMENT_METHOD_QR_BUCKET).getPublicUrl(path);
  const publicUrl = String(publicData?.publicUrl || '').trim();

  if (!publicUrl) {
    throw new Error('No se pudo obtener la URL de la imagen QR.');
  }

  return publicUrl;
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

    const formData = await request.formData();
    const methodId = Number(normalizeTextField(formData.get('id')));
    const isEditing = Number.isFinite(methodId) && methodId > 0;

    const allowYape = normalizeBooleanField(formData.get('allowYape'));
    const allowPlin = normalizeBooleanField(formData.get('allowPlin'));
    const type = parseTypeFromFlags(allowYape, allowPlin);
    const numberDigits = normalizeDigits(normalizeTextField(formData.get('number')));
    const isActiveField = formData.get('isActive');
    const isActive = isActiveField === null ? true : normalizeBooleanField(isActiveField);
    const qrImageEntry = formData.get('qrFile');
    const qrImageFile = qrImageEntry instanceof File && qrImageEntry.size > 0 ? qrImageEntry : null;

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

    let currentMethodQr = '';
    if (isEditing) {
      const { data: currentMethod, error: currentMethodError } = await auth.supabase
        .from('paymentMethod')
        .select('id,QR')
        .eq('id', methodId)
        .maybeSingle();

      if (currentMethodError) {
        log.database('SELECT payment method before update', 'paymentMethod', currentMethodError, { id: methodId });
        throw new Error('No se pudo obtener el método de pago a actualizar.');
      }

      if (!currentMethod) {
        return NextResponse.json({ error: 'El método de pago no existe.' }, { status: 404 });
      }

      currentMethodQr = String((currentMethod as { QR?: string | null })?.QR || '').trim();
    }

    let qr = currentMethodQr;
    if (qrImageFile) {
      qr = await uploadQrImage(qrImageFile, auth.user.id);
    }

    if (!qr) {
      return NextResponse.json({ error: 'Debes subir una imagen QR.' }, { status: 400 });
    }

    const rawName = normalizeTextField(formData.get('name'));
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
