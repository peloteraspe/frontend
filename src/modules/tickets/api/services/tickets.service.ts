import 'server-only';
import { randomUUID } from 'crypto';
import { log } from '@core/lib/logger';
import { buildGoogleWalletSaveUrl, getGoogleWalletConfig } from './google-wallet.service';

const GOOGLE_WALLET_FORCED_CLASS_ID = 'peloteras_event_16';

export type TicketStatus = 'pending' | 'active' | 'used' | 'revoked';

type AssistantRow = {
  id: number;
  event: number | null;
  user: string | null;
  state: string | null;
};

type ProfileRow = {
  username: string | null;
};

type EventRow = {
  title: string | null;
  start_time: string | null;
  end_time: string | null;
};

type TicketRow = {
  id: number;
  assistant_id: number;
  event_id: number;
  user_id: string;
  status: TicketStatus;
  qr_token: string;
  apple_wallet_url: string | null;
  google_wallet_url: string | null;
};

export type EnsureTicketResult = {
  ticket: TicketRow | null;
  reason?: 'ticket_table_missing';
};

function isMissingTicketTableError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('ticket') && message.includes('does not exist');
}

function mapAssistantStateToTicketStatus(state: string | null | undefined): TicketStatus {
  if (state === 'approved') return 'active';
  if (state === 'rejected') return 'revoked';
  return 'pending';
}

function buildQrToken() {
  return randomUUID().replace(/-/g, '');
}

function resolveWalletUrl(template: string | undefined, token: string) {
  if (!template || !template.trim()) return null;
  return template.includes('{token}')
    ? template.replace('{token}', encodeURIComponent(token))
    : template;
}

async function resolveTicketHolderName(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('profile')
    .select('username')
    .eq('user', userId)
    .maybeSingle();

  if (error) {
    log.database('SELECT profile username for ticket', 'profile', error, { userId });
    return 'Peloteras';
  }

  const profile = data as ProfileRow | null;
  if (profile?.username && profile.username.trim()) {
    return profile.username.trim();
  }

  return 'Peloteras';
}

export async function ensureTicketForAssistant(
  supabase: any,
  assistantId: number
): Promise<EnsureTicketResult> {
  const { data: assistant, error: assistantError } = await supabase
    .from('assistants')
    .select('id, event, user, state')
    .eq('id', assistantId)
    .maybeSingle();

  if (assistantError) {
    log.database('SELECT assistant for ticket', 'assistants', assistantError, { assistantId });
    throw new Error('No se pudo obtener la inscripción para generar entrada.');
  }

  const row = assistant as AssistantRow | null;
  if (!row || !row.event || !row.user) {
    throw new Error('La inscripción no tiene datos suficientes para generar entrada.');
  }

  const mappedStatus = mapAssistantStateToTicketStatus(row.state);
  const nowIso = new Date().toISOString();

  let eventTitle: string | null = null;
  let eventStartTime: string | null = null;
  let eventEndTime: string | null = null;

  try {
    const { data: eventData, error: eventError } = await supabase
      .from('event')
      .select('title, start_time, end_time')
      .eq('id', row.event)
      .maybeSingle();

    if (eventError) {
      log.database('SELECT event metadata for wallet ticket', 'event', eventError, {
        assistantId,
        eventId: row.event,
      });
    } else {
      const eventRow = eventData as EventRow | null;
      eventTitle = typeof eventRow?.title === 'string' ? eventRow.title.trim() : null;
      eventStartTime = typeof eventRow?.start_time === 'string' ? eventRow.start_time.trim() : null;
      eventEndTime = typeof eventRow?.end_time === 'string' ? eventRow.end_time.trim() : null;
    }
  } catch (eventLookupError) {
    log.warn('Could not load event metadata for wallet ticket', 'TICKETS', {
      assistantId,
      eventId: row.event,
      error: eventLookupError,
    });
  }

  const { data: existingByEventUser, error: existingError } = await supabase
    .from('ticket')
    .select('*')
    .eq('event_id', row.event)
    .eq('user_id', row.user)
    .maybeSingle();

  if (existingError) {
    if (isMissingTicketTableError(existingError)) {
      return { ticket: null, reason: 'ticket_table_missing' };
    }

    log.database('SELECT ticket by event/user', 'ticket', existingError, {
      assistantId,
      eventId: row.event,
      userId: row.user,
    });
    throw new Error('No se pudo revisar la entrada existente.');
  }

  const existing = existingByEventUser as TicketRow | null;
  const qrToken = existing?.qr_token || buildQrToken();
  const finalStatus: TicketStatus = existing?.status === 'used' ? 'used' : mappedStatus;
  const googleWalletConfig = await getGoogleWalletConfig();
  const appleWalletUrl =
    existing?.apple_wallet_url || resolveWalletUrl(process.env.APPLE_WALLET_URL_TEMPLATE, qrToken);
  const ticketHolderName = await resolveTicketHolderName(supabase, row.user);
  const generatedGoogleWalletUrl = await buildGoogleWalletSaveUrl(
    {
      qrToken,
      ticketNumber: String(row.id),
      ticketHolderName,
      eventTitle,
      eventStartTime,
      eventEndTime,
      classId: GOOGLE_WALLET_FORCED_CLASS_ID,
    },
    googleWalletConfig
  );
  const googleWalletUrl =
    generatedGoogleWalletUrl ||
    resolveWalletUrl(process.env.GOOGLE_WALLET_URL_TEMPLATE, qrToken);

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('ticket')
      .update({
        assistant_id: row.id,
        status: finalStatus,
        qr_token: qrToken,
        apple_wallet_url: appleWalletUrl,
        google_wallet_url: googleWalletUrl,
        updated_at: nowIso,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateError) {
      log.database('UPDATE ticket', 'ticket', updateError, {
        ticketId: existing.id,
        assistantId,
        status: finalStatus,
      });
      throw new Error('No se pudo actualizar la entrada.');
    }

    return { ticket: updated as TicketRow };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('ticket')
    .insert({
      assistant_id: row.id,
      event_id: row.event,
      user_id: row.user,
      status: finalStatus,
      qr_token: qrToken,
      qr_generated_at: nowIso,
      apple_wallet_url: appleWalletUrl,
      google_wallet_url: googleWalletUrl,
      updated_at: nowIso,
    })
    .select('*')
    .single();

  if (insertError) {
    log.database('INSERT ticket', 'ticket', insertError, {
      assistantId,
      eventId: row.event,
      userId: row.user,
    });
    throw new Error('No se pudo crear la entrada.');
  }

  return { ticket: inserted as TicketRow };
}
