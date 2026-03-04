import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { isAdmin } from '@shared/lib/auth/isAdmin';
import { log } from '@core/lib/logger';

function isMissingTicketTableError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('ticket') && message.includes('does not exist');
}

export async function POST(request: Request) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Solo administradoras pueden validar entradas.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const rawToken = String(body?.token || '').trim();
    const token = rawToken.startsWith('PELOTERAS:TICKET:')
      ? rawToken.replace('PELOTERAS:TICKET:', '')
      : rawToken;

    if (!token) {
      return NextResponse.json({ error: 'Token de QR inválido.' }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('ticket')
      .select('id, event_id, user_id, status, used_at, qr_token')
      .eq('qr_token', token)
      .maybeSingle();

    if (ticketError) {
      if (isMissingTicketTableError(ticketError)) {
        return NextResponse.json(
          { error: 'La tabla ticket no existe todavía. Ejecuta migraciones.' },
          { status: 409 }
        );
      }

      log.database('SELECT ticket by qr', 'ticket', ticketError, { token });
      return NextResponse.json({ error: 'No se pudo validar la entrada.' }, { status: 500 });
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Entrada no encontrada.' }, { status: 404 });
    }

    if (ticket.status === 'used') {
      return NextResponse.json(
        {
          ok: false,
          status: 'used',
          message: 'La entrada ya fue utilizada.',
          ticket: {
            id: ticket.id,
            eventId: ticket.event_id,
            userId: ticket.user_id,
            usedAt: ticket.used_at,
          },
        },
        { status: 409 }
      );
    }

    if (ticket.status !== 'active') {
      return NextResponse.json(
        {
          ok: false,
          status: ticket.status,
          message: 'La entrada no está activa para ingreso.',
        },
        { status: 409 }
      );
    }

    const usedAt = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('ticket')
      .update({
        status: 'used',
        used_at: usedAt,
        updated_at: usedAt,
      })
      .eq('id', ticket.id)
      .select('id, event_id, user_id, status, used_at')
      .single();

    if (updateError) {
      log.database('UPDATE ticket used', 'ticket', updateError, { ticketId: ticket.id });
      return NextResponse.json({ error: 'No se pudo marcar la entrada como usada.' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      ticket: {
        id: updated.id,
        eventId: updated.event_id,
        userId: updated.user_id,
        status: updated.status,
        usedAt: updated.used_at,
      },
    });
  } catch (error: any) {
    log.error('Error validating ticket', 'TICKETS', error);
    return NextResponse.json({ error: error.message || 'No se pudo validar el QR.' }, { status: 500 });
  }
}
