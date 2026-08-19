export const MAX_TEAM_SOCIAL_HANDLE_LENGTH = 30;

const TEAM_SOCIAL_HANDLE_PATTERN = /^[a-zA-Z0-9._]+$/;

export type TeamSocialHandleResult =
  | { ok: true; value: string | null; error: null }
  | { ok: false; value: null; error: string };

export const TEAM_SOCIAL_HANDLE_ERROR =
  'Formato incorrecto. Usa @micuenta o micuenta, solo con letras, números, punto o guion bajo.';

export function normalizeTeamSocialHandle(value: unknown): TeamSocialHandleResult {
  if (typeof value !== 'string') return { ok: true, value: null, error: null };

  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null, error: null };

  const candidate = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  if (
    !candidate ||
    candidate.length > MAX_TEAM_SOCIAL_HANDLE_LENGTH ||
    !TEAM_SOCIAL_HANDLE_PATTERN.test(candidate)
  ) {
    return { ok: false, value: null, error: TEAM_SOCIAL_HANDLE_ERROR };
  }

  return { ok: true, value: candidate, error: null };
}
