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

export type EventParticipant = {
  userId: string;
  name: string;
  email: string;
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
  const normalizedEventId = normalizeId(eventId);
  if (!normalizedEventId) return [];

  const supabase = await getServerSupabase();
  const { data: assistants, error: assistantsError } = await supabase
    .from('assistants')
    .select('user')
    .eq('event', normalizedEventId)
    .eq('state', 'approved');

  if (assistantsError) {
    log.database('SELECT approved participants by event', 'assistants', assistantsError, {
      eventId: normalizedEventId,
    });
    return [];
  }

  const userIds = Array.from(
    new Set(
      (assistants ?? [])
        .map((assistant: any) => normalizeId(assistant?.user))
        .filter((userId) => userId.length > 0)
    )
  );
  if (!userIds.length) return [];

  const [profilesRes, authUsersById] = await Promise.all([
    supabase.from('profile').select('user,username').in('user', userIds as any),
    getAuthUsersByIds(userIds),
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

  return userIds
    .map((userId) => {
      const authUser = authUsersById.get(userId);
      const email = normalizeName(authUser?.email);
      const metadataName = normalizeName(
        authUser?.user_metadata?.username || authUser?.user_metadata?.full_name
      );
      return {
        userId,
        name: buildParticipantName({
          userId,
          profileName: profileByUserId.get(userId),
          metadataName,
          email,
        }),
        email: email || 'Sin correo',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}
