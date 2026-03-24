import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { assertCanManageEvent } from '@modules/admin/api/events/services/eventPermissions.service';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import {
  buildVerifiedPlayerPath,
  normalizeLegacyTicketQrToken,
  parseVerifiedPlayerQrValue,
} from '@modules/tickets/lib/verifiedPlayerQr';

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  }

  if (!isAdmin(user as any)) {
    return NextResponse.json({ error: 'Solo administradoras pueden resolver QRs.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const rawValue = String(body?.value || '').trim();
  if (!rawValue) {
    return NextResponse.json({ error: 'QR vacío.' }, { status: 400 });
  }

  const direct = parseVerifiedPlayerQrValue(rawValue);
  if (direct) {
    try {
      await assertCanManageEvent(String(direct.eventId));
    } catch {
      return NextResponse.json(
        { error: 'No tienes permisos para revisar ese QR.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      path: direct.path,
      eventId: direct.eventId,
      userId: direct.userId,
      source: 'verified_player_path',
    });
  }

  const qrToken = normalizeLegacyTicketQrToken(rawValue);
  if (!qrToken) {
    return NextResponse.json({ error: 'No se pudo interpretar el QR.' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data: ticket, error } = await admin
    .from('ticket')
    .select('event_id,user_id')
    .eq('qr_token', qrToken)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'No se pudo resolver la entrada desde el QR.' }, { status: 500 });
  }

  if (!ticket) {
    return NextResponse.json({ error: 'No encontramos una entrada asociada a ese QR.' }, { status: 404 });
  }

  try {
    await assertCanManageEvent(String(ticket.event_id));
  } catch {
    return NextResponse.json(
      { error: 'No tienes permisos para revisar ese QR.' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    path: buildVerifiedPlayerPath(ticket.event_id, ticket.user_id),
    eventId: ticket.event_id,
    userId: ticket.user_id,
    source: 'legacy_ticket_token',
  });
}
