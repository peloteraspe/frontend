-- =============================================================
-- Coupon reimbursement workflow
-- =============================================================

ALTER TABLE public.coupon_redemption
  ADD COLUMN IF NOT EXISTS reimbursement_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reimbursement_requested_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS organizer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS organizer_confirmed_by UUID REFERENCES auth.users(id);

UPDATE public.coupon_redemption
SET reimbursement_requested_at = COALESCE(reimbursement_requested_at, redeemed_at)
WHERE reimbursement_status = 'pending'
  AND reimbursement_requested_at IS NULL;

UPDATE public.coupon_redemption
SET organizer_confirmed_at = COALESCE(organizer_confirmed_at, reimbursed_at)
WHERE reimbursement_status = 'deposited'
  AND organizer_confirmed_at IS NULL;

UPDATE public.coupon_redemption
SET reimbursement_status = CASE
  WHEN reimbursement_status = 'pending' THEN 'requested'
  WHEN reimbursement_status = 'deposited' THEN 'confirmed'
  ELSE reimbursement_status
END
WHERE reimbursement_status IN ('pending', 'deposited');

ALTER TABLE public.coupon_redemption
  ALTER COLUMN reimbursement_status SET DEFAULT 'not_requested';

ALTER TABLE public.coupon_redemption
  DROP CONSTRAINT IF EXISTS coupon_redemption_reimbursement_status_check;

ALTER TABLE public.coupon_redemption
  ADD CONSTRAINT coupon_redemption_reimbursement_status_check
  CHECK (
    reimbursement_status IN ('not_requested', 'requested', 'sent', 'confirmed', 'canceled')
  );

DROP INDEX IF EXISTS coupon_redemption_pending_idx;

CREATE INDEX IF NOT EXISTS coupon_redemption_requested_idx
  ON public.coupon_redemption (reimbursement_status)
  WHERE reimbursement_status = 'requested';

CREATE INDEX IF NOT EXISTS coupon_redemption_outstanding_idx
  ON public.coupon_redemption (event_id, reimbursement_status)
  WHERE reimbursement_status IN ('not_requested', 'requested', 'sent');
