import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import {
  getGoogleWalletSettingsSummary,
  listGoogleWalletEventClasses,
  parseGoogleServiceAccountJson,
  upsertGoogleWalletSettings,
} from '@modules/tickets/api/services/google-wallet.service';

type SaveWalletSettingsPayload = {
  issuerId?: string;
  activeClassId?: string | null;
  origins?: string[] | string;
  serviceAccountJson?: string;
  serviceAccountEmail?: string;
  serviceAccountPrivateKey?: string;
  validateConnection?: boolean;
};

function normalizeOrigins(raw: SaveWalletSettingsPayload['origins']) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
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
      errorResponse: NextResponse.json({ error: 'Solo admins pueden configurar Wallet.' }, { status: 403 }),
    };
  }

  return { user };
}

export async function GET() {
  try {
    const auth = await requireAdminUser();
    if ('errorResponse' in auth) return auth.errorResponse;

    const settings = await getGoogleWalletSettingsSummary();

    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error: any) {
    log.error('Error fetching wallet settings', 'ADMIN_WALLET', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo obtener la configuración de Wallet.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminUser();
    if ('errorResponse' in auth) return auth.errorResponse;

    const body = (await request.json().catch(() => ({}))) as SaveWalletSettingsPayload;
    const issuerId = String(body?.issuerId || '').trim();
    const activeClassId =
      typeof body?.activeClassId === 'string' ? body.activeClassId.trim() || null : null;
    const origins = normalizeOrigins(body?.origins);

    const rawServiceAccountJson = String(body?.serviceAccountJson || '').trim();
    const serviceAccountEmailFromBody = String(body?.serviceAccountEmail || '').trim();
    const serviceAccountPrivateKeyFromBody = String(body?.serviceAccountPrivateKey || '').trim();

    let serviceAccountEmail: string | undefined;
    let serviceAccountPrivateKey: string | undefined;

    if (rawServiceAccountJson) {
      const parsed = parseGoogleServiceAccountJson(rawServiceAccountJson);
      serviceAccountEmail = parsed.serviceAccountEmail;
      serviceAccountPrivateKey = parsed.privateKey;
    } else {
      if (serviceAccountEmailFromBody) serviceAccountEmail = serviceAccountEmailFromBody;
      if (serviceAccountPrivateKeyFromBody) serviceAccountPrivateKey = serviceAccountPrivateKeyFromBody;
    }

    await upsertGoogleWalletSettings({
      issuerId,
      activeClassId,
      serviceAccountEmail,
      serviceAccountPrivateKey,
      origins,
      updatedBy: auth.user.id,
    });

    const settings = await getGoogleWalletSettingsSummary();
    let classes = [] as Awaited<ReturnType<typeof listGoogleWalletEventClasses>>;

    if (body?.validateConnection) {
      classes = await listGoogleWalletEventClasses();
    }

    return NextResponse.json({
      ok: true,
      settings,
      classes,
    });
  } catch (error: any) {
    log.error('Error saving wallet settings', 'ADMIN_WALLET', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo guardar la configuración de Wallet.' },
      { status: 500 }
    );
  }
}
