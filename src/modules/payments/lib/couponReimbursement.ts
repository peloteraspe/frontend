export const couponReimbursementStatuses = [
  'not_requested',
  'requested',
  'sent',
  'confirmed',
  'canceled',
] as const;

export type CouponReimbursementStatus = (typeof couponReimbursementStatuses)[number];

export function normalizeCouponReimbursementStatus(value: unknown): CouponReimbursementStatus {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'requested' || normalized === 'pending') return 'requested';
  if (normalized === 'sent') return 'sent';
  if (normalized === 'confirmed' || normalized === 'deposited') return 'confirmed';
  if (normalized === 'canceled') return 'canceled';

  return 'not_requested';
}

export function canRequestCouponReimbursement(status: CouponReimbursementStatus) {
  return status === 'not_requested';
}

export function canMarkCouponReimbursementSent(status: CouponReimbursementStatus) {
  return status === 'requested';
}

export function canApproveCouponPayment(status: CouponReimbursementStatus) {
  return status === 'sent' || status === 'confirmed';
}

export function isCouponReimbursementTerminal(status: CouponReimbursementStatus) {
  return status === 'confirmed' || status === 'canceled';
}

export function shouldReleaseCouponUsage(status: CouponReimbursementStatus | unknown) {
  const normalized = normalizeCouponReimbursementStatus(status);
  return normalized === 'not_requested' || normalized === 'requested';
}

export function shouldBlockCouponReuse(status: CouponReimbursementStatus | unknown) {
  return normalizeCouponReimbursementStatus(status) !== 'canceled';
}

export function getCouponReimbursementStatusLabel(status: CouponReimbursementStatus) {
  if (status === 'not_requested') return 'Pendiente de solicitud';
  if (status === 'requested') return 'Solicitado a Peloteras';
  if (status === 'sent') return 'Enviado por Peloteras';
  if (status === 'confirmed') return 'Confirmado';
  return 'Cancelado';
}

export function getCouponReimbursementStatusVariant(status: CouponReimbursementStatus) {
  if (status === 'confirmed') return 'success' as const;
  if (status === 'canceled') return 'error' as const;
  if (status === 'sent') return 'info' as const;
  return 'warning' as const;
}
