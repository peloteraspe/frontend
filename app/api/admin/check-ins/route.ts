import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { jsonNoStore } from '@core/api/responses';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { log } from '@core/lib/logger';
import {
  CheckinServiceError,
  createCheckin,
  listAdminCheckins,
} from '@modules/checkins/api/services/checkins.service';

async function requireSuperAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }),
    };
  }

  if (!isSuperAdmin(user as any)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Solo superadmin puede gestionar check-ins.' },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

export async function GET() {
  try {
    const { errorResponse } = await requireSuperAdmin();
    if (errorResponse) return errorResponse;

    const checkins = await listAdminCheckins();
    return jsonNoStore({ checkins });
  } catch (error: any) {
    if (error instanceof CheckinServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    log.error('List admin check-ins failed', 'CHECKINS', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron cargar los check-ins.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireSuperAdmin();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const checkin = await createCheckin({
      eventId: String(body?.eventId || ''),
      name: String(body?.name || ''),
      slug: String(body?.slug || ''),
      createdBy: String(user?.id || ''),
    });

    return jsonNoStore({ checkin }, 201);
  } catch (error: any) {
    if (error instanceof CheckinServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    log.error('Create admin check-in failed', 'CHECKINS', error);
    return NextResponse.json({ error: 'No se pudo crear el check-in.' }, { status: 500 });
  }
}
