export type SupabaseUserLite = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
} | null;

export function isAdmin(user: SupabaseUserLite): boolean {
  if (!user) return false;
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const byEmail = user.email ? admins.includes(user.email.toLowerCase()) : false;
  const byMetadata = Boolean(
    (user?.app_metadata && (user.app_metadata.role === 'admin' || user.app_metadata?.is_admin)) ||
      (user?.user_metadata && (user.user_metadata.role === 'admin' || user.user_metadata?.is_admin))
  );

  return byEmail || byMetadata;
}
