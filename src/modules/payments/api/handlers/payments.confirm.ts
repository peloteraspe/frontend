import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';

function parseEventId(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseOperationNumber(value: unknown) {
  const op = String(value ?? '').trim();
  return /^\d{8}$/.test(op) ? op : null;
}

export async function POST(request: Request) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const eventId = parseEventId(body?.eventId);
    const operationNumber = parseOperationNumber(body?.operationNumber);

    if (!eventId) {
      return NextResponse.json({ error: 'eventId inválido.' }, { status: 400 });
    }

    if (!operationNumber) {
      return NextResponse.json({ error: 'Número de operación inválido.' }, { status: 400 });
    }

    const admin = getAdminSupabase();

    const { data: eventRow, error: eventError } = await admin
      .from('event')
      .select('id,start_time')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      log.database('SELECT event for payment confirm', 'event', eventError, { eventId, userId: user.id });
      return NextResponse.json({ error: 'No se pudo validar el evento.' }, { status: 500 });
    }

    if (!eventRow) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    const eventStart = eventRow?.start_time ? new Date(String(eventRow.start_time)) : null;
    if (eventStart && !Number.isNaN(eventStart.getTime()) && eventStart.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Este evento ya inició o finalizó. La inscripción está cerrada.' },
        { status: 409 }
      );
    }

    const { data: existingAssistant, error: existingError } = await admin
      .from('assistants')
      .select('id')
      .eq('event', eventId)
      .eq('user', user.id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      log.database('SELECT assistants for payment confirm', 'assistants', existingError, {
        eventId,
        userId: user.id,
      });
      return NextResponse.json({ error: 'No se pudo validar la inscripción.' }, { status: 500 });
    }

    if (existingAssistant?.id) {
      const { data: updated, error: updateError } = await admin
        .from('assistants')
        .update({
          operationNumber,
          state: 'pending',
        })
        .eq('id', existingAssistant.id)
        .select('id')
        .single();

      if (updateError) {
        log.database('UPDATE assistants for payment confirm', 'assistants', updateError, {
          assistantId: existingAssistant.id,
          eventId,
          userId: user.id,
        });
        return NextResponse.json({ error: 'No se pudo actualizar la inscripción.' }, { status: 500 });
      }

      return NextResponse.json({ ok: true, assistantId: updated.id }, { status: 200 });
    }

    const { data: inserted, error: insertError } = await admin
      .from('assistants')
      .insert({
        operationNumber,
        event: eventId,
        user: user.id,
        state: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      log.database('INSERT assistants for payment confirm', 'assistants', insertError, {
        eventId,
        userId: user.id,
      });
      return NextResponse.json({ error: 'No se pudo registrar la inscripción.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, assistantId: inserted.id }, { status: 200 });
  } catch (error: any) {
    log.error('Payment confirm failed', 'PAYMENTS', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo confirmar el pago.' },
      { status: 500 }
    );
  }
}
