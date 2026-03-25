import { getAdminSupabase } from '@core/api/supabase.admin';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';

type AuthUserLite = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

type ProfileRow = {
  user: string;
  username: string | null;
};

type TicketAttendanceRow = {
  id: number;
  user_id: string | null;
  status: string | null;
  used_at: string | null;
};

export type EventParticipant = {
  userId: string;
  name: string;
  email: string;
  state: string;
  ticketStatus: string;
  attendedAt: string | null;
  hasAttended: boolean;
};

function normalizeId(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeName(input: unknown) {
  return String(input ?? '').trim();
}

function emailName(email: string) {
  return String(email || '').split('@')[0]?.trim() || '';
}

function isMissingTicketTableError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('ticket') && message.includes('does not exist');
}

function buildParticipantName(params: {
  userId: string;
  profileName?: string;
  metadataName?: string;
  email?: string;
}) {
  const profileName = normalizeName(params.profileName);
  if (profileName) return profileName;

  const metadataName = normalizeName(params.metadataName);
  if (metadataName) return metadataName;

  const fromEmail = emailName(normalizeName(params.email));
  if (fromEmail) return fromEmail;

  return params.userId;
}

export async function getApprovedParticipantsCountByEventIds(eventIds: Array<string | number>) {
  const normalizedEventIds = Array.from(
    new Set(eventIds.map((eventId) => normalizeId(eventId)).filter((eventId) => eventId.length > 0))
  );
  const countByEventId = new Map<string, number>();
  if (!normalizedEventIds.length) return countByEventId;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('assistants')
    .select('event')
    .eq('state', 'approved')
    .in('event', normalizedEventIds as any);

  if (error) {
    log.database('SELECT approved participants by events', 'assistants', error, {
      eventIds: normalizedEventIds,
    });
    return countByEventId;
  }

  (data ?? []).forEach((assistant: any) => {
    const eventId = normalizeId(assistant?.event);
    if (!eventId) return;
    countByEventId.set(eventId, (countByEventId.get(eventId) ?? 0) + 1);
  });

  return countByEventId;
}

async function getAuthUsersByIds(userIds: string[]) {
  const adminSupabase = getAdminSupabase();
  const normalizedIds = Array.from(
    new Set(userIds.map((userId) => normalizeId(userId)).filter((userId) => userId.length > 0))
  );
  const usersById = new Map<string, AuthUserLite>();
  if (!normalizedIds.length) return usersById;

  const missingIds = new Set(normalizedIds);
  let page = 1;
  const perPage = 200;

  while (missingIds.size > 0) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      log.error('Failed to list auth users for event participants', 'ADMIN_EVENTS', error, {
        page,
      });
      break;
    }

    const chunk = (data?.users ?? []) as AuthUserLite[];
    if (!chunk.length) break;

    chunk.forEach((authUser) => {
      const userId = normalizeId(authUser?.id);
      if (!userId || !missingIds.has(userId)) return;
      usersById.set(userId, authUser);
      missingIds.delete(userId);
    });

    if (chunk.length < perPage) break;
    page += 1;
  }

  return usersById;
}

export async function getApprovedParticipantsByEventId(eventId: string): Promise<EventParticipant[]> {
  return getParticipantContactsByEventId(eventId, ['approved']);
}

export async function getParticipantContactsByEventId(
  eventId: string,
  allowedStates: string[] = ['pending', 'approved']
): Promise<EventParticipant[]> {
  const normalizedEventId = normalizeId(eventId);
  if (!normalizedEventId) return [];
  const allowedStateSet = new Set(
    allowedStates.map((state) => String(state || '').trim().toLowerCase()).filter(Boolean)
  );

  const supabase = await getServerSupabase();
  const { data: assistants, error: assistantsError } = await supabase
    .from('assistants')
    .select('id,user,state')
    .eq('event', normalizedEventId)
    .order('id', { ascending: false });

  if (assistantsError) {
    log.database('SELECT participants by event', 'assistants', assistantsError, {
      eventId: normalizedEventId,
    });
    return [];
  }

  const assistantsByUserId = new Map<string, string>();
  (assistants ?? []).forEach((assistant: any) => {
    const userId = normalizeId(assistant?.user);
    const state = normalizeName(assistant?.state).toLowerCase();
    if (!userId || !state || !allowedStateSet.has(state) || assistantsByUserId.has(userId)) return;
    assistantsByUserId.set(userId, state);
  });

  const userIds = Array.from(assistantsByUserId.keys());
  if (!userIds.length) return [];

  const adminSupabase = getAdminSupabase();
  const [profilesRes, authUsersById, ticketsRes] = await Promise.all([
    supabase.from('profile').select('user,username').in('user', userIds as any),
    getAuthUsersByIds(userIds),
    adminSupabase
      .from('ticket')
      .select('id,user_id,status,used_at')
      .eq('event_id', normalizedEventId as any)
      .in('user_id', userIds as any)
      .order('id', { ascending: false }),
  ]);

  const profileByUserId = new Map<string, string>();
  if (profilesRes.error) {
    log.database('SELECT profile names for event participants', 'profile', profilesRes.error, {
      eventId: normalizedEventId,
    });
  } else {
    ((profilesRes.data ?? []) as ProfileRow[]).forEach((profile) => {
      const userId = normalizeId(profile.user);
      const username = normalizeName(profile.username);
      if (userId && username) profileByUserId.set(userId, username);
    });
  }

  const ticketByUserId = new Map<string, TicketAttendanceRow>();
  if (ticketsRes.error) {
    if (isMissingTicketTableError(ticketsRes.error)) {
      log.warn('Tickets table not found yet while loading event participants attendance.', 'ADMIN_EVENTS', {
        eventId: normalizedEventId,
      });
    } else {
      log.database('SELECT tickets for event participants attendance', 'ticket', ticketsRes.error, {
        eventId: normalizedEventId,
        userIds,
      });
    }
  } else {
    ((ticketsRes.data ?? []) as TicketAttendanceRow[]).forEach((ticket) => {
      const userId = normalizeId(ticket.user_id);
      if (!userId || ticketByUserId.has(userId)) return;
      ticketByUserId.set(userId, ticket);
    });
  }

  return userIds
    .map((userId) => {
      const authUser = authUsersById.get(userId);
      const email = normalizeName(authUser?.email);
      const metadataName = normalizeName(
        authUser?.user_metadata?.username || authUser?.user_metadata?.full_name
      );
      const ticket = ticketByUserId.get(userId);
      const ticketStatus = normalizeName(ticket?.status).toLowerCase();
      const attendedAt = ticket?.used_at ?? null;
      return {
        userId,
        name: buildParticipantName({
          userId,
          profileName: profileByUserId.get(userId),
          metadataName,
          email,
        }),
        email: email || 'Sin correo',
        state: assistantsByUserId.get(userId) || '',
        ticketStatus,
        attendedAt,
        hasAttended: ticketStatus === 'used' || Boolean(attendedAt),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}
