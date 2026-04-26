export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 15;

export const USERNAME_REQUIREMENTS_MESSAGE =
  'Usa un nombre de usuario de 3 a 15 caracteres, sin espacios.';

type UsernameValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string; reason: 'required' | 'too_short' | 'too_long' | 'spaces' };

export function normalizeUsername(value: unknown) {
  return String(value ?? '').trim();
}

export function validateUsername(value: unknown): UsernameValidationResult {
  const username = normalizeUsername(value);

  if (!username) {
    return { ok: false, reason: 'required', message: 'Este campo es requerido.' };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return {
      ok: false,
      reason: 'too_short',
      message: `Mínimo ${USERNAME_MIN_LENGTH} caracteres.`,
    };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      reason: 'too_long',
      message: `Máximo ${USERNAME_MAX_LENGTH} caracteres.`,
    };
  }

  if (/\s/.test(username)) {
    return {
      ok: false,
      reason: 'spaces',
      message: 'El nombre de usuario no puede tener espacios.',
    };
  }

  return { ok: true, value: username };
}

export function validateUsernameForForm(value: unknown) {
  const result = validateUsername(value);
  if (result.ok === true) return true;
  return result.message;
}
