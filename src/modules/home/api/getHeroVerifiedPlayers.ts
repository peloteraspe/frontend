import 'server-only';

import { unstable_cache } from 'next/cache';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import type { HeroVerifiedPlayer } from '@modules/home/model/heroVerifiedPlayer';

type AssistantUserRow = {
  user: string | null;
};

type AuthUserLite = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, any> | null;
};

type ProfileRow = {
  user: string | null;
  username: string | null;
};

const HERO_PLAYER_CACHE_SECONDS = 30 * 60;

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function emailName(email: string) {
  return normalizeText(email).split('@')[0]?.trim() || '';
}

function toInitials(value: unknown) {
  const parts = normalizeText(value)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  return normalizeText(value).slice(0, 2).toUpperCase() || 'PL';
}

function hasConfirmedEmail(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveAvatarUrl(metadata?: Record<string, any> | null) {
  if (!metadata) return null;

  const candidates = [
    metadata.avatar,
    metadata.avatar_url,
    metadata.picture,
    metadata.photoURL,
    metadata.profile_image_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

async function loadHeroVerifiedPlayers(): Promise<HeroVerifiedPlayer[]> {
  const adminSupabase = getAdminSupabase();

  const { data: assistantsData, error: assistantsError } = await adminSupabase
    .from('assistants')
    .select('user')
    .eq('state', 'approved')
    .not('user', 'is', null);

  if (assistantsError) {
    log.database('SELECT approved assistants for home hero', 'assistants', assistantsError as any);
    return [];
  }

  const approvedUserIds = Array.from(
    new Set(
      ((assistantsData ?? []) as AssistantUserRow[])
        .map((row) => normalizeText(row.user))
        .filter((userId) => userId.length > 0)
    )
  );

  if (!approvedUserIds.length) return [];

  const approvedUserIdSet = new Set(approvedUserIds);
  const verifiedUsers: AuthUserLite[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      log.error('Failed to list auth users for home hero', 'HOME_HERO', error, { page });
      break;
    }

    const chunk = (data?.users ?? []) as AuthUserLite[];
    if (!chunk.length) break;

    chunk.forEach((authUser) => {
      const userId = normalizeText(authUser?.id);
      if (!userId || !approvedUserIdSet.has(userId)) return;
      if (!hasConfirmedEmail(authUser?.email_confirmed_at)) return;
      verifiedUsers.push(authUser);
    });

    if (chunk.length < perPage) break;
    page += 1;
  }

  if (!verifiedUsers.length) return [];

  const verifiedUserIds = Array.from(
    new Set(verifiedUsers.map((user) => normalizeText(user.id)).filter(Boolean))
  );

  const { data: profileData, error: profileError } = await adminSupabase
    .from('profile')
    .select('user,username')
    .in('user', verifiedUserIds as any);

  if (profileError) {
    log.database('SELECT profiles for home hero', 'profile', profileError as any, {
      verifiedUserCount: verifiedUserIds.length,
    });
  }

  const profileNameByUserId = new Map<string, string>();
  ((profileData ?? []) as ProfileRow[]).forEach((profile) => {
    const userId = normalizeText(profile.user);
    const username = normalizeText(profile.username);
    if (userId && username) {
      profileNameByUserId.set(userId, username);
    }
  });

  return verifiedUsers
    .map((user) => {
      const userId = normalizeText(user.id);
      const metadataName =
        normalizeText(user.user_metadata?.username) || normalizeText(user.user_metadata?.full_name);
      const email = normalizeText(user.email);
      const name = profileNameByUserId.get(userId) || metadataName || emailName(email) || 'Pelotera';

      return {
        id: userId,
        name,
        avatarUrl: resolveAvatarUrl(user.user_metadata),
        initials: toInitials(name),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

const getHeroVerifiedPlayersCached = unstable_cache(loadHeroVerifiedPlayers, ['home-hero-verified-players'], {
  revalidate: HERO_PLAYER_CACHE_SECONDS,
});

export async function getHeroVerifiedPlayers() {
  try {
    return await getHeroVerifiedPlayersCached();
  } catch (error) {
    log.warn('Could not load verified players for home hero', 'HOME_HERO', { error });
    return [];
  }
}
