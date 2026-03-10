import 'server-only';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';

export type StoredEventAnnouncementRecipientResult = {
  email: string;
  userId: string | null;
  name: string | null;
  participantState: string | null;
  status: 'queued' | 'failed';
  providerMessageId: string | null;
  errorMessage: string | null;
};

export type EventAnnouncementHistoryFailure = {
  email: string;
  name: string;
  errorMessage: string;
};

export type EventAnnouncementHistoryItem = {
  id: number;
  createdAt: string;
  eventId: number | null;
  eventTitle: string | null;
  subject: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  status: 'completed' | 'partial' | 'failed';
  sourceAnnouncementId: number | null;
  canRetryFailed: boolean;
  failedRecipients: EventAnnouncementHistoryFailure[];
};

function normalizeAnnouncementStatus(sentCount: number, failedCount: number) {
  if (sentCount > 0 && failedCount > 0) return 'partial' as const;
  if (sentCount === 0 && failedCount > 0) return 'failed' as const;
  return 'completed' as const;
}

export async function recordEventAnnouncement(input: {
  eventId: string;
  createdByUserId: string | null;
  subject: string;
  body: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  sourceAnnouncementId?: number | null;
  recipientResults: StoredEventAnnouncementRecipientResult[];
}) {
  try {
    const adminSupabase = getAdminSupabase();
    const status = normalizeAnnouncementStatus(input.sentCount, input.failedCount);
    const eventId = Number(input.eventId);

    const { data: announcement, error: announcementError } = await adminSupabase
      .from('event_announcement')
      .insert({
        event_id: eventId,
        created_by_user_id: input.createdByUserId,
        subject: input.subject,
        body: input.body,
        total_recipients: input.totalRecipients,
        sent_count: input.sentCount,
        failed_count: input.failedCount,
        status,
        source_announcement_id: input.sourceAnnouncementId ?? null,
      })
      .select('id')
      .single();

    if (announcementError) {
      throw new Error(announcementError.message);
    }

    const announcementId = Number(announcement?.id);
    if (!Number.isInteger(announcementId) || announcementId <= 0) {
      throw new Error('No se pudo resolver el ID del anuncio.');
    }

    if (input.recipientResults.length > 0) {
      const { error: recipientsError } = await adminSupabase.from('event_announcement_recipient').insert(
        input.recipientResults.map((recipient) => ({
          announcement_id: announcementId,
          event_id: eventId,
          recipient_user_id: recipient.userId,
          recipient_name: recipient.name,
          recipient_email: recipient.email,
          participant_state: recipient.participantState,
          status: recipient.status,
          provider_message_id: recipient.providerMessageId,
          error_message: recipient.errorMessage,
        }))
      );

      if (recipientsError) {
        throw new Error(recipientsError.message);
      }
    }

    return {
      announcementId,
      errorMessage: null as string | null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    log.error('Failed to persist event announcement history', 'ADMIN_EVENTS', error, {
      eventId: input.eventId,
      recipientCount: input.recipientResults.length,
    });
    return {
      announcementId: null as number | null,
      errorMessage,
    };
  }
}

export async function getEventAnnouncementHistory(eventId: string, limit = 8): Promise<EventAnnouncementHistoryItem[]> {
  const adminSupabase = getAdminSupabase();
  const numericEventId = Number(eventId);

  const { data: announcements, error: announcementsError } = await adminSupabase
    .from('event_announcement')
    .select('id, created_at, subject, total_recipients, sent_count, failed_count, status, source_announcement_id')
    .eq('event_id', numericEventId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (announcementsError) {
    log.database('SELECT event announcements', 'event_announcement', announcementsError, {
      eventId: numericEventId,
    });
    return [];
  }

  const announcementRows = (announcements ?? []) as Array<{
    id: number;
    created_at: string;
    subject: string;
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    status: 'completed' | 'partial' | 'failed';
    source_announcement_id: number | null;
  }>;

  if (!announcementRows.length) return [];

  const announcementIds = announcementRows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
  const sourceAnnouncementIds = new Set(
    announcementRows
      .map((row) => Number(row.source_announcement_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );

  const { data: failures, error: failuresError } = await adminSupabase
    .from('event_announcement_recipient')
    .select('announcement_id, recipient_name, recipient_email, error_message')
    .in('announcement_id', announcementIds as any)
    .eq('status', 'failed')
    .order('created_at', { ascending: false });

  if (failuresError) {
    log.database('SELECT event announcement failures', 'event_announcement_recipient', failuresError, {
      announcementIds,
    });
  }

  const failuresByAnnouncementId = new Map<number, EventAnnouncementHistoryFailure[]>();
  ((failures ?? []) as Array<{
    announcement_id: number;
    recipient_name: string | null;
    recipient_email: string;
    error_message: string | null;
  }>).forEach((failure) => {
    const announcementId = Number(failure.announcement_id);
    if (!Number.isInteger(announcementId) || announcementId <= 0) return;

    const bucket = failuresByAnnouncementId.get(announcementId) ?? [];
    bucket.push({
      name: String(failure.recipient_name || '').trim() || 'Sin nombre',
      email: String(failure.recipient_email || '').trim(),
      errorMessage: String(failure.error_message || '').trim() || 'Sin detalle',
    });
    failuresByAnnouncementId.set(announcementId, bucket);
  });

  return announcementRows.map((row) => ({
    id: Number(row.id),
    createdAt: String(row.created_at || ''),
    eventId: numericEventId,
    eventTitle: null,
    subject: String(row.subject || '').trim(),
    totalRecipients: Number(row.total_recipients || 0),
    sentCount: Number(row.sent_count || 0),
    failedCount: Number(row.failed_count || 0),
    status: (row.status || 'completed') as 'completed' | 'partial' | 'failed',
    sourceAnnouncementId: row.source_announcement_id === null ? null : Number(row.source_announcement_id),
    canRetryFailed: Number(row.failed_count || 0) > 0 && !sourceAnnouncementIds.has(Number(row.id)),
    failedRecipients: failuresByAnnouncementId.get(Number(row.id)) ?? [],
  }));
}

export async function getGlobalEventAnnouncementHistory(limit = 30): Promise<EventAnnouncementHistoryItem[]> {
  const adminSupabase = getAdminSupabase();

  const { data: announcements, error: announcementsError } = await adminSupabase
    .from('event_announcement')
    .select(
      'id, created_at, event_id, subject, total_recipients, sent_count, failed_count, status, source_announcement_id, event(title)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (announcementsError) {
    log.database('SELECT global event announcements', 'event_announcement', announcementsError);
    return [];
  }

  const announcementRows = (announcements ?? []) as Array<{
    id: number;
    created_at: string;
    event_id: number | null;
    subject: string;
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    status: 'completed' | 'partial' | 'failed';
    source_announcement_id: number | null;
    event?: { title?: string | null } | Array<{ title?: string | null }> | null;
  }>;

  if (!announcementRows.length) return [];

  const announcementIds = announcementRows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
  const sourceAnnouncementIds = new Set(
    announcementRows
      .map((row) => Number(row.source_announcement_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );

  const { data: failures, error: failuresError } = await adminSupabase
    .from('event_announcement_recipient')
    .select('announcement_id, recipient_name, recipient_email, error_message')
    .in('announcement_id', announcementIds as any)
    .eq('status', 'failed')
    .order('created_at', { ascending: false });

  if (failuresError) {
    log.database('SELECT global event announcement failures', 'event_announcement_recipient', failuresError, {
      announcementIds,
    });
  }

  const failuresByAnnouncementId = new Map<number, EventAnnouncementHistoryFailure[]>();
  ((failures ?? []) as Array<{
    announcement_id: number;
    recipient_name: string | null;
    recipient_email: string;
    error_message: string | null;
  }>).forEach((failure) => {
    const announcementId = Number(failure.announcement_id);
    if (!Number.isInteger(announcementId) || announcementId <= 0) return;

    const bucket = failuresByAnnouncementId.get(announcementId) ?? [];
    bucket.push({
      name: String(failure.recipient_name || '').trim() || 'Sin nombre',
      email: String(failure.recipient_email || '').trim(),
      errorMessage: String(failure.error_message || '').trim() || 'Sin detalle',
    });
    failuresByAnnouncementId.set(announcementId, bucket);
  });

  return announcementRows.map((row) => {
    const eventRelation = Array.isArray(row.event) ? row.event[0] : row.event;
    return {
      id: Number(row.id),
      createdAt: String(row.created_at || ''),
      eventId: row.event_id === null ? null : Number(row.event_id),
      eventTitle: String(eventRelation?.title || '').trim() || null,
      subject: String(row.subject || '').trim(),
      totalRecipients: Number(row.total_recipients || 0),
      sentCount: Number(row.sent_count || 0),
      failedCount: Number(row.failed_count || 0),
      status: (row.status || 'completed') as 'completed' | 'partial' | 'failed',
      sourceAnnouncementId: row.source_announcement_id === null ? null : Number(row.source_announcement_id),
      canRetryFailed: Number(row.failed_count || 0) > 0 && !sourceAnnouncementIds.has(Number(row.id)),
      failedRecipients: failuresByAnnouncementId.get(Number(row.id)) ?? [],
    };
  });
}

export async function getEventAnnouncementById(announcementId: number) {
  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('event_announcement')
    .select('id, event_id, subject, body, failed_count')
    .eq('id', announcementId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as
    | {
        id: number;
        event_id: number;
        subject: string;
        body: string;
        failed_count: number;
      }
    | null;
}

export async function getFailedRecipientsForAnnouncement(announcementId: number) {
  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('event_announcement_recipient')
    .select('recipient_user_id, recipient_name, recipient_email, participant_state')
    .eq('announcement_id', announcementId)
    .eq('status', 'failed')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{
    recipient_user_id: string | null;
    recipient_name: string | null;
    recipient_email: string;
    participant_state: string | null;
  }>).map((row) => ({
    userId: row.recipient_user_id,
    name: String(row.recipient_name || '').trim() || 'Sin nombre',
    email: String(row.recipient_email || '').trim().toLowerCase(),
    participantState: String(row.participant_state || '').trim() || null,
  }));
}
