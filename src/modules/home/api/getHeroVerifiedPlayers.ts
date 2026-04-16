import 'server-only';

import { unstable_cache } from 'next/cache';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import type { HeroVerifiedPlayer } from '@modules/home/model/heroVerifiedPlayer';

export type HeroCommunitySnapshot = {
  registeredPlayersCount: number;
  verifiedPlayers: HeroVerifiedPlayer[];
};

type AuthUserLite = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, any> | null;
};

type ProfileRow = {
  user: string | null;
  username: string | null;
};

const HERO_PLAYER_CACHE_SECONDS = 30 * 60;
const HERO_PLAYER_PAYLOAD_LIMIT = 32;

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

function hasTimestamp(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function evenlySamplePlayers(players: HeroVerifiedPlayer[], limit: number) {
  if (players.length <= limit) {
    return players;
  }

  const step = players.length / limit;

  return Array.from({ length: limit }, (_, index) => players[Math.floor(index * step)]).filter(
    (player): player is HeroVerifiedPlayer => Boolean(player)
  );
}

function trimHeroPlayers(players: HeroVerifiedPlayer[], limit: number) {
  if (players.length <= limit) {
    return players;
  }

  const playersWithAvatar = players.filter((player) => typeof player.avatarUrl === 'string' && player.avatarUrl.trim());
  const playersWithoutAvatar = players.filter(
    (player) => !(typeof player.avatarUrl === 'string' && player.avatarUrl.trim())
  );

  const avatarTarget = Math.min(limit, Math.max(Math.ceil(limit * 0.75), Math.min(playersWithAvatar.length, 1)));
  const sampledWithAvatar = evenlySamplePlayers(playersWithAvatar, avatarTarget);
  const remainingSlots = Math.max(limit - sampledWithAvatar.length, 0);
  const sampledWithoutAvatar = evenlySamplePlayers(playersWithoutAvatar, remainingSlots);

  return [...sampledWithAvatar, ...sampledWithoutAvatar].slice(0, limit);
}

function isVerifiedAuthUser(user?: AuthUserLite | null) {
  return hasTimestamp(user?.email_confirmed_at) || hasTimestamp(user?.last_sign_in_at);
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

async function loadHeroVerifiedPlayers(): Promise<HeroCommunitySnapshot> {
  const adminSupabase = getAdminSupabase();
  const verifiedUsers: AuthUserLite[] = [];
  let registeredPlayersCount = 0;
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
    registeredPlayersCount += chunk.length;

    chunk.forEach((authUser) => {
      if (!isVerifiedAuthUser(authUser)) return;
      verifiedUsers.push(authUser);
    });

    if (chunk.length < perPage) break;
    page += 1;
  }

  if (!verifiedUsers.length) {
    return {
      registeredPlayersCount,
      verifiedPlayers: [],
    };
  }

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

  const verifiedPlayers = verifiedUsers
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

  return {
    registeredPlayersCount,
    verifiedPlayers: trimHeroPlayers(verifiedPlayers, HERO_PLAYER_PAYLOAD_LIMIT),
  };
}

const getHeroVerifiedPlayersCached = unstable_cache(loadHeroVerifiedPlayers, ['home-hero-verified-players'], {
  revalidate: HERO_PLAYER_CACHE_SECONDS,
});

export async function getHeroCommunitySnapshot(): Promise<HeroCommunitySnapshot> {
  try {
    return await getHeroVerifiedPlayersCached();
  } catch (error) {
    log.warn('Could not load verified players for home hero', 'HOME_HERO', { error });
    return {
      registeredPlayersCount: 0,
      verifiedPlayers: [],
    };
  }
}

export async function getHeroVerifiedPlayers() {
  const snapshot = await getHeroCommunitySnapshot();
  return snapshot.verifiedPlayers;
}
