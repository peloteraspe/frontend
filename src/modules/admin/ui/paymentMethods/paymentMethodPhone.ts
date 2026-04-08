const PERU_DIAL_CODE = '51';

export function normalizePaymentMethodPhone(value: string | number | null | undefined) {
  const digits = String(value ?? '').replace(/\D+/g, '');

  if (!digits || digits === PERU_DIAL_CODE) return '';
  if (digits.length === 11 && digits.startsWith(PERU_DIAL_CODE)) {
    return digits.slice(PERU_DIAL_CODE.length);
  }

  return digits;
}

export function validatePaymentMethodPhone(value: string | number | null | undefined) {
  const normalized = normalizePaymentMethodPhone(value);

  if (!normalized) return 'El número de pago es obligatorio.';
  if (normalized.length < 8 || normalized.length > 15) {
    return 'El número de pago debe tener entre 8 y 15 dígitos.';
  }

  return '';
}
