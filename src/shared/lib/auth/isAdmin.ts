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

export function isAdmin(user: SupabaseUserLite): boolean {
  if (!user) return false;
  const admins = parseEmailList(process.env.ADMIN_EMAILS);
  const byEmail = user.email
    ? [...admins, ...Array.from(SUPERADMIN_EMAILS)].includes(user.email.toLowerCase())
    : false;
  const byMetadata =
    isRole(user, 'admin') ||
    isRole(user, 'superadmin') ||
    isFlagEnabled(user, 'is_admin') ||
    isFlagEnabled(user, 'is_superadmin');

  return byEmail || byMetadata;
}

export function isSuperAdmin(user: SupabaseUserLite): boolean {
  if (!user) return false;
  return Boolean(user.email && SUPERADMIN_EMAILS.has(user.email.toLowerCase()));
}
