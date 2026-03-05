import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import { listGoogleWalletEventClasses } from '@modules/tickets/api/services/google-wallet.service';

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
      errorResponse: NextResponse.json({ error: 'Solo admins pueden consultar clases Wallet.' }, { status: 403 }),
    };
  }

  return { user };
}

export async function GET() {
  try {
    const auth = await requireAdminUser();
    if ('errorResponse' in auth) return auth.errorResponse;

    const classes = await listGoogleWalletEventClasses();
    return NextResponse.json({ ok: true, classes });
  } catch (error: any) {
    log.error('Error listing wallet classes', 'ADMIN_WALLET', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudieron listar clases de Wallet.' },
      { status: 500 }
    );
  }
}
