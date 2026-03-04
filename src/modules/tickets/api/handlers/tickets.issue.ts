import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { ensureTicketForAssistant } from '../services/tickets.service';

export async function POST(request: Request) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const assistantId = Number(body?.assistantId);

    if (!Number.isFinite(assistantId) || assistantId <= 0) {
      return NextResponse.json({ error: 'assistantId inválido.' }, { status: 400 });
    }

    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id, user')
      .eq('id', assistantId)
      .maybeSingle();

    if (assistantError) {
      log.database('SELECT assistant issue ticket', 'assistants', assistantError, { assistantId });
      return NextResponse.json({ error: 'No se pudo validar la inscripción.' }, { status: 500 });
    }

    if (!assistant) {
      return NextResponse.json({ error: 'Inscripción no encontrada.' }, { status: 404 });
    }

    if (assistant.user !== user.id) {
      return NextResponse.json({ error: 'No autorizado para esta inscripción.' }, { status: 403 });
    }

    const result = await ensureTicketForAssistant(supabase, assistantId);
    if (result.reason === 'ticket_table_missing') {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      ticket: {
        id: result.ticket?.id,
        status: result.ticket?.status,
        qrToken: result.ticket?.qr_token,
        appleWalletUrl: result.ticket?.apple_wallet_url,
        googleWalletUrl: result.ticket?.google_wallet_url,
      },
    });
  } catch (error: any) {
    log.error('Error issuing ticket', 'TICKETS', error);
    return NextResponse.json({ error: error.message || 'No se pudo generar la entrada.' }, { status: 500 });
  }
}
