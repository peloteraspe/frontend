'use server';

import { getAdminSupabase } from '@core/api/supabase.admin';
import { isAdmin, isSuperAdmin } from '@shared/lib/auth/isAdmin';

type AuthUserLite = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, any> | null;
  user_metadata?: Record<string, any> | null;
};

type ProfileRow = {
  user: string;
  username: string | null;
};

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeName(user: AuthUserLite, profileByUserId: Map<string, string>) {
  const profileName = profileByUserId.get(user.id);
  if (profileName) return profileName;

  const metadataName =
    String(user.user_metadata?.username || user.user_metadata?.full_name || '').trim();
  if (metadataName) return metadataName;

  const emailName = String(user.email || '').split('@')[0]?.trim();
  if (emailName) return emailName;

  return 'Sin nombre';
}

async function listAllAuthUsers() {
  const adminSupabase = getAdminSupabase();
  const users: AuthUserLite[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const chunk = (data?.users ?? []) as AuthUserLite[];
    users.push(...chunk);

    if (chunk.length < perPage) break;
    page += 1;
  }

  return users;
}

async function getProfileNameMap() {
  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('profile')
    .select('user,username')
    .order('username', { ascending: true });

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  ((data ?? []) as ProfileRow[]).forEach((row) => {
    const userId = String(row.user || '').trim();
    const username = String(row.username || '').trim();
    if (userId && username) {
      map.set(userId, username);
    }
  });
  return map;
}

export async function getAdminUsersList(): Promise<AdminUserListItem[]> {
  const [authUsers, profileNameMap] = await Promise.all([listAllAuthUsers(), getProfileNameMap()]);

  return authUsers
    .filter((user) => Boolean(user?.id) && Boolean(String(user?.email || '').trim()))
    .map((user) => {
      const email = String(user.email || '').trim();
      return {
        id: user.id,
        name: normalizeName(user, profileNameMap),
        email,
        isAdmin: isAdmin(user as any),
        isSuperAdmin: isSuperAdmin(user as any),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

export async function setAdminRoleByUserId(userId: string, enableAdmin: boolean) {
  const normalizedId = String(userId || '').trim();
  if (!normalizedId) throw new Error('Id de usuario inválido.');

  const adminSupabase = getAdminSupabase();

  const { data: target, error: targetError } = await adminSupabase.auth.admin.getUserById(normalizedId);
  if (targetError) throw new Error(targetError.message);
  if (!target?.user) throw new Error('Usuario no encontrado.');

  const targetUser = target.user as AuthUserLite;
  const targetIsSuperAdmin = isSuperAdmin(targetUser as any);

  if (!enableAdmin && targetIsSuperAdmin) {
    throw new Error('No puedes retirar permisos admin a una superadmin.');
  }

  const currentAppMetadata = (targetUser.app_metadata ?? {}) as Record<string, any>;
  const currentUserMetadata = (targetUser.user_metadata ?? {}) as Record<string, any>;

  const nextAppMetadata: Record<string, any> = {
    ...currentAppMetadata,
    is_admin: enableAdmin,
  };
  const nextUserMetadata: Record<string, any> = {
    ...currentUserMetadata,
    is_admin: enableAdmin,
  };

  if (enableAdmin) {
    if (nextAppMetadata.role !== 'superadmin') nextAppMetadata.role = 'admin';
    if (nextUserMetadata.role !== 'superadmin') nextUserMetadata.role = 'admin';
  } else {
    if (nextAppMetadata.role === 'admin') delete nextAppMetadata.role;
    if (nextUserMetadata.role === 'admin') delete nextUserMetadata.role;
  }

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(normalizedId, {
    app_metadata: nextAppMetadata,
    user_metadata: nextUserMetadata,
  });
  if (updateError) throw new Error(updateError.message);
}

export async function getUserEmailsForBroadcastByIds(userIds: string[]): Promise<string[]> {
  const normalizedIds = Array.from(
    new Set(
      userIds
        .map((userId) => String(userId || '').trim())
        .filter(Boolean)
    )
  );

  if (!normalizedIds.length) return [];

  const allowedIds = new Set(normalizedIds);
  const authUsers = await listAllAuthUsers();

  return Array.from(
    new Set(
      authUsers
        .filter((user) => allowedIds.has(String(user?.id || '').trim()))
        .map((user) => String(user?.email || '').trim().toLowerCase())
        .filter((email) => isValidEmail(email))
    )
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}
