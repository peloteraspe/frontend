import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import { assertCanManageEvent } from '@modules/admin/api/events/services/eventPermissions.service';
import { markAttendance } from '@modules/tickets/api/services/qrAttendance.service';

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  }

  if (!isAdmin(user as any)) {
    return NextResponse.json({ error: 'Solo administradoras pueden marcar asistencia.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const eventId = Number(body?.eventId);
  const userId = String(body?.userId || '').trim();

  if (!Number.isInteger(eventId) || eventId <= 0 || !userId) {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  try {
    await assertCanManageEvent(String(eventId));
  } catch {
    return NextResponse.json({ error: 'No tienes permisos para marcar asistencia en este evento.' }, { status: 403 });
  }

  try {
    const result = await markAttendance({ eventId, userId });
    if (!result.ok) {
      const statusCode = result.status === 'not_registered' ? 404 : 409;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo marcar la asistencia.' },
      { status: 500 }
    );
  }
}
