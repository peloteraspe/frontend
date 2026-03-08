export type SupabaseUserLite = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
} | null;

const SUPERADMIN_EMAILS = new Set([
  'fiorellasaro27@gmail.com',
  'peloteras.com@gmail.com',
  'andrealemonroy@gmail.com',
]);

function parseEmailList(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isRole(user: SupabaseUserLite, role: string) {
  if (!user) return false;
  return Boolean(
    (user?.app_metadata && user.app_metadata.role === role) ||
      (user?.user_metadata && user.user_metadata.role === role)
  );
}

function isFlagEnabled(user: SupabaseUserLite, flag: string) {
  if (!user) return false;
  return Boolean(
    (user?.app_metadata && user.app_metadata[flag]) || (user?.user_metadata && user.user_metadata[flag])
  );
}

function isExplicitFalse(value: unknown) {
  if (value === false) return true;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'false';
  return false;
}

function hasExplicitAdminRevocation(user: SupabaseUserLite) {
  if (!user) return false;
  const appFlag = user?.app_metadata?.is_admin;
  const userFlag = user?.user_metadata?.is_admin;
  const hasFalseFlag = isExplicitFalse(appFlag) || isExplicitFalse(userFlag);
  if (!hasFalseFlag) return false;

  // If role/flag says superadmin, revocation should not override.
  if (isRole(user, 'superadmin') || isFlagEnabled(user, 'is_superadmin')) return false;
  return true;
}

export function isAdmin(user: SupabaseUserLite): boolean {
  if (!user) return false;

  // Superadmin always keeps admin permissions.
  if (isSuperAdmin(user) || isRole(user, 'superadmin') || isFlagEnabled(user, 'is_superadmin')) {
    return true;
  }

  // Explicit switch-off from superadmin must win over ADMIN_EMAILS fallback.
  if (hasExplicitAdminRevocation(user)) return false;

  const admins = parseEmailList(process.env.ADMIN_EMAILS);
  const byEmail = user.email
    ? admins.includes(user.email.toLowerCase())
    : false;
  const byMetadata =
    isRole(user, 'admin') ||
    isFlagEnabled(user, 'is_admin') ||
    isRole(user, 'superadmin') ||
    isFlagEnabled(user, 'is_superadmin');

  return byEmail || byMetadata;
}

export function isSuperAdmin(user: SupabaseUserLite): boolean {
  if (!user) return false;
  return Boolean(user.email && SUPERADMIN_EMAILS.has(user.email.toLowerCase()));
}
