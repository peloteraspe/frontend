'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@core/api/supabase.server';
import { getAdminSupabase } from '@core/api/supabase.admin';
import { log } from '@core/lib/logger';
import { getApprovedParticipantsCountByEventId } from '@modules/events/api/queries/getApprovedParticipantsCount';
import {
  EVENT_SOLD_OUT_MESSAGE,
  isEventSoldOut,
  isEventSoldOutError,
} from '@modules/events/lib/eventCapacity';
import { ensureTicketForAssistant } from '@modules/tickets/api/services/tickets.service';
import { sendPaymentStatusEmail } from '@modules/payments/api/services/payment-status-email.service';
import { isAdmin, isSuperAdmin } from '@shared/lib/auth/isAdmin';
import {
  canApproveCouponPayment,
  normalizeCouponReimbursementStatus,
  shouldReleaseCouponUsage,
  type CouponReimbursementStatus,
} from '@modules/payments/lib/couponReimbursement';

export type PaymentReviewDecision = 'approve' | 'reject';

export type PaymentReviewActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  decision: PaymentReviewDecision | null;
};

type CouponRedemptionRow = {
  id: number;
  coupon_id: number;
  reimbursement_status: CouponReimbursementStatus | string | null;
  reimbursement_requested_at?: string | null;
  reimbursement_requested_by?: string | null;
  reimbursed_at?: string | null;
  reimbursed_by?: string | null;
  organizer_confirmed_at?: string | null;
  organizer_confirmed_by?: string | null;
};

function normalizeAssistantId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function formatPaymentReviewError(error: unknown, decision: PaymentReviewDecision) {
  const fallback =
    decision === 'approve' ? 'No se pudo aprobar el pago.' : 'No se pudo rechazar el pago.';

  if (!(error instanceof Error)) return fallback;

  const message = String(error.message || '').trim();
  if (!message) return fallback;
  if (message === 'Failed to approve assistant' || message === 'Failed to reject assistant') {
    return fallback;
  }

  return message;
}

async function loadAssistantEmailContext(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  assistantId: number
) {
  const { data: assistant, error: assistantError } = await supabase
    .from('assistants')
    .select('id,user,event')
    .eq('id', assistantId)
    .maybeSingle();

  if (assistantError || !assistant?.user || !assistant?.event) {
    log.warn('Could not load assistant for payment status email', 'EMAIL', {
      assistantId,
      assistantError,
    });
    return null;
  }

  const { data: eventData, error: eventError } = await supabase
    .from('event')
    .select('title,start_time,location_text')
    .eq('id', assistant.event)
    .maybeSingle();

  if (eventError) {
    log.database('SELECT event for payment status email', 'event', eventError as any, {
      assistantId,
      eventId: assistant.event,
    });
  }

  let toEmail = '';
  const admin = getAdminSupabase();
  try {
    const { data, error } = await admin.auth.admin.getUserById(String(assistant.user));
    if (error) {
      log.warn('Could not load auth user for payment status email', 'EMAIL', {
        assistantId,
        userId: assistant.user,
        error,
      });
    } else {
      toEmail = String(data?.user?.email || '').trim();
    }
  } catch (error) {
    log.error('Payment status email user lookup failed', 'EMAIL', error, {
      assistantId,
      userId: assistant.user,
    });
  }

  const { data: profile } = await supabase
    .from('profile')
    .select('username')
    .eq('user', assistant.user)
    .maybeSingle();

  const toName = String((profile as any)?.username || '').trim() || null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';

  return {
    toEmail,
    toName,
    eventTitle: String((eventData as any)?.title || ''),
    eventStartTime: String((eventData as any)?.start_time || ''),
    eventLocation: String((eventData as any)?.location_text || ''),
    ticketsUrl: `${baseUrl}/tickets/${assistant.user}`,
  };
}

async function notifyAssistantPaymentStatus(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  assistantId: number,
  status: 'approved' | 'rejected'
) {
  try {
    const context = await loadAssistantEmailContext(supabase, assistantId);
    if (!context?.toEmail) {
      log.warn('Skipping payment status email: no recipient email for assistant', 'EMAIL', {
        assistantId,
        status,
      });
      return;
    }

    await sendPaymentStatusEmail({
      status,
      toEmail: context.toEmail,
      toName: context.toName,
      eventTitle: context.eventTitle,
      eventStartTime: context.eventStartTime,
      eventLocation: context.eventLocation,
      ticketsUrl: context.ticketsUrl,
    });
  } catch (error) {
    log.error('Payment status email dispatch failed', 'EMAIL', error, {
      assistantId,
      status,
    });
  }
}

async function assertCanManageAssistant(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  assistantId: number
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user as any)) {
    throw new Error('No autorizado para gestionar pagos.');
  }

  if (isSuperAdmin(user as any)) return user;

  const { data: assistant, error: assistantError } = await supabase
    .from('assistants')
    .select('event')
    .eq('id', assistantId)
    .maybeSingle();

  if (assistantError || !assistant?.event) {
    throw new Error('No se encontró el pago.');
  }

  const { data: event, error: eventError } = await supabase
    .from('event')
    .select('created_by_id')
    .eq('id', assistant.event)
    .maybeSingle();

  if (eventError || !event) {
    throw new Error('No se encontró el evento asociado al pago.');
  }

  if (String(event.created_by_id || '') !== String(user?.id || '')) {
    throw new Error('No autorizado para gestionar pagos de este evento.');
  }

  return user;
}

async function loadAssistantCouponRedemption(
  admin: ReturnType<typeof getAdminSupabase>,
  assistantId: number
) {
  const { data, error } = await admin
    .from('coupon_redemption')
    .select(
      'id,coupon_id,reimbursement_status,reimbursement_requested_at,reimbursement_requested_by,reimbursed_at,reimbursed_by,organizer_confirmed_at,organizer_confirmed_by'
    )
    .eq('assistant_id', assistantId)
    .maybeSingle();

  if (error) {
    log.warn('Could not query coupon_redemption for assistant review (table may not exist yet)', 'ADMIN_PAYMENTS', {
      assistantId,
      errorMessage: error.message,
    });
    return null;
  }

  return (data as CouponRedemptionRow | null) ?? null;
}

async function releaseCouponUsage(admin: ReturnType<typeof getAdminSupabase>, couponId: number) {
  const { data: coupon, error: couponError } = await admin
    .from('coupon')
    .select('current_uses')
    .eq('id', couponId)
    .maybeSingle();

  if (couponError || !coupon) {
    log.database('SELECT coupon before release', 'coupon', couponError as any, { couponId });
    throw new Error('No se pudo liberar el uso del cupón.');
  }

  const nextUses = Math.max(0, Number(coupon.current_uses || 0) - 1);
  const { error: updateError } = await admin
    .from('coupon')
    .update({ current_uses: nextUses })
    .eq('id', couponId);

  if (updateError) {
    log.database('UPDATE coupon current_uses after rejection', 'coupon', updateError, { couponId, nextUses });
    throw new Error('No se pudo liberar el uso del cupón.');
  }
}

export async function approveAssistant(id: string) {
  try {
    const supabase = await getServerSupabase();
    const admin = getAdminSupabase();
    const assistantId = normalizeAssistantId(id);
    if (!assistantId) throw new Error('Id de pago inválido.');
    const managerUser = await assertCanManageAssistant(supabase, assistantId);

    const { data: assistantBefore, error: assistantBeforeError } = await supabase
      .from('assistants')
      .select('state,event')
      .eq('id', assistantId)
      .maybeSingle();

    if (assistantBeforeError || !assistantBefore) {
      throw new Error('No se encontro el pago antes de aprobar.');
    }
    const shouldNotify = assistantBefore.state !== 'approved';

    if (shouldNotify) {
      const { data: eventRow, error: eventError } = await supabase
        .from('event')
        .select('id,max_users')
        .eq('id', assistantBefore.event)
        .maybeSingle();

      if (eventError || !eventRow) {
        throw new Error('No se encontró el evento asociado al pago.');
      }

      const approvedCount = await getApprovedParticipantsCountByEventId(assistantBefore.event, supabase);
      if (isEventSoldOut((eventRow as any)?.max_users, approvedCount)) {
        throw new Error(EVENT_SOLD_OUT_MESSAGE);
      }
    }

    const couponRedemption = await loadAssistantCouponRedemption(admin, assistantId);
    const normalizedCouponStatus = couponRedemption
      ? normalizeCouponReimbursementStatus(couponRedemption.reimbursement_status)
      : null;

    if (normalizedCouponStatus && !canApproveCouponPayment(normalizedCouponStatus)) {
      throw new Error(
        normalizedCouponStatus === 'requested'
          ? 'Peloteras aún no marcó este abono como enviado.'
          : 'Primero solicita a Peloteras el abono del cupón antes de aprobar a la jugadora.'
      );
    }

    const { error } = await supabase
      .from('assistants')
      .update({ state: 'approved' })
      .eq('id', assistantId);

    if (error) {
      if (isEventSoldOutError(error)) {
        throw new Error(EVENT_SOLD_OUT_MESSAGE);
      }
      log.database('UPDATE approve assistant', 'assistants', error, { id });
      throw new Error('Failed to approve assistant');
    }

    if (couponRedemption && normalizedCouponStatus === 'sent') {
      const { error: couponConfirmError } = await admin
        .from('coupon_redemption')
        .update({
          reimbursement_status: 'confirmed',
          organizer_confirmed_at: new Date().toISOString(),
          organizer_confirmed_by: String(managerUser?.id || '').trim() || null,
        })
        .eq('id', couponRedemption.id);

      if (couponConfirmError) {
        log.database('UPDATE coupon_redemption confirm after approval', 'coupon_redemption', couponConfirmError, {
          assistantId,
          redemptionId: couponRedemption.id,
        });
      }
    }

    try {
      const result = await ensureTicketForAssistant(supabase, assistantId);
      if (result.reason === 'ticket_table_missing') {
        log.warn('Ticket table missing while approving assistant', 'ADMIN_PAYMENTS', {
          assistantId,
        });
      }
    } catch (ticketError: any) {
      log.warn('Ticket sync failed after assistant approval', 'ADMIN_PAYMENTS', {
        assistantId,
        message: ticketError?.message,
      });
    }

    if (shouldNotify) {
      await notifyAssistantPaymentStatus(supabase, assistantId, 'approved');
    }

    log.info('Assistant approved', 'ADMIN_PAYMENTS', { assistantId: id });
    revalidatePath('/admin/payments');

    return { success: true };
  } catch (error) {
    log.error('Error approving assistant', 'ADMIN_PAYMENTS', error, { id });
    throw error;
  }
}

export async function rejectAssistant(id: string) {
  try {
    const supabase = await getServerSupabase();
    const admin = getAdminSupabase();
    const assistantId = normalizeAssistantId(id);
    if (!assistantId) throw new Error('Id de pago inválido.');
    await assertCanManageAssistant(supabase, assistantId);

    const { data: assistantBefore, error: assistantBeforeError } = await supabase
      .from('assistants')
      .select('state')
      .eq('id', assistantId)
      .maybeSingle();

    if (assistantBeforeError || !assistantBefore) {
      throw new Error('No se encontro el pago antes de rechazar.');
    }
    const shouldNotify = assistantBefore.state !== 'rejected';

    const couponRedemption = shouldNotify ? await loadAssistantCouponRedemption(admin, assistantId) : null;
    const normalizedCouponStatus = couponRedemption
      ? normalizeCouponReimbursementStatus(couponRedemption.reimbursement_status)
      : null;

    const { error } = await supabase
      .from('assistants')
      .update({ state: 'rejected' })
      .eq('id', assistantId);

    if (error) {
      log.database('UPDATE reject assistant', 'assistants', error, { id });
      throw new Error('Failed to reject assistant');
    }

    if (
      shouldNotify &&
      couponRedemption &&
      normalizedCouponStatus &&
      shouldReleaseCouponUsage(normalizedCouponStatus)
    ) {
      let couponMarkedCanceled = false;

      try {
        const { error: redemptionCancelError } = await admin
          .from('coupon_redemption')
          .update({
            reimbursement_status: 'canceled',
            reimbursement_requested_at: null,
            reimbursement_requested_by: null,
            reimbursed_at: null,
            reimbursed_by: null,
            organizer_confirmed_at: null,
            organizer_confirmed_by: null,
          })
          .eq('id', couponRedemption.id);

        if (redemptionCancelError) {
          log.database('UPDATE coupon_redemption cancel after rejection', 'coupon_redemption', redemptionCancelError, {
            assistantId,
            redemptionId: couponRedemption.id,
          });
          throw new Error('No se pudo cancelar la solicitud del cupón.');
        }

        couponMarkedCanceled = true;
        await releaseCouponUsage(admin, couponRedemption.coupon_id);
      } catch (couponError) {
        if (couponMarkedCanceled) {
          const { error: redemptionRollbackError } = await admin
            .from('coupon_redemption')
            .update({
              reimbursement_status: normalizedCouponStatus,
              reimbursement_requested_at: couponRedemption.reimbursement_requested_at ?? null,
              reimbursement_requested_by: couponRedemption.reimbursement_requested_by ?? null,
              reimbursed_at: couponRedemption.reimbursed_at ?? null,
              reimbursed_by: couponRedemption.reimbursed_by ?? null,
              organizer_confirmed_at: couponRedemption.organizer_confirmed_at ?? null,
              organizer_confirmed_by: couponRedemption.organizer_confirmed_by ?? null,
            })
            .eq('id', couponRedemption.id);

          if (redemptionRollbackError) {
            log.database(
              'ROLLBACK coupon_redemption after rejection failure',
              'coupon_redemption',
              redemptionRollbackError,
              {
                assistantId,
                redemptionId: couponRedemption.id,
              }
            );
          }
        }

        const { error: assistantRollbackError } = await supabase
          .from('assistants')
          .update({ state: assistantBefore.state })
          .eq('id', assistantId);

        if (assistantRollbackError) {
          log.database('ROLLBACK assistant after coupon rejection failure', 'assistants', assistantRollbackError, {
            assistantId,
            previousState: assistantBefore.state,
          });
        }

        throw couponError instanceof Error
          ? couponError
          : new Error('No se pudo liberar el cupón. El rechazo no fue aplicado.');
      }
    }

    try {
      const result = await ensureTicketForAssistant(supabase, assistantId);
      if (result.reason === 'ticket_table_missing') {
        log.warn('Ticket table missing while rejecting assistant', 'ADMIN_PAYMENTS', {
          assistantId,
        });
      }
    } catch (ticketError: any) {
      log.warn('Ticket sync failed after assistant rejection', 'ADMIN_PAYMENTS', {
        assistantId,
        message: ticketError?.message,
      });
    }

    if (shouldNotify) {
      await notifyAssistantPaymentStatus(supabase, assistantId, 'rejected');
    }

    log.info('Assistant rejected', 'ADMIN_PAYMENTS', { assistantId: id });
    revalidatePath('/admin/payments');

    return { success: true };
  } catch (error) {
    log.error('Error rejecting assistant', 'ADMIN_PAYMENTS', error, { id });
    throw error;
  }
}

export async function submitPaymentReviewAction(
  _previousState: PaymentReviewActionState,
  formData: FormData
): Promise<PaymentReviewActionState> {
  const assistantId = String(formData.get('assistantId') || '').trim();
  const decision = String(formData.get('decision') || '').trim();

  if (!assistantId) {
    return {
      status: 'error',
      message: 'No se encontró el pago que intentas gestionar.',
      decision: null,
    };
  }

  if (decision !== 'approve' && decision !== 'reject') {
    return {
      status: 'error',
      message: 'La acción solicitada no es válida.',
      decision: null,
    };
  }

  try {
    if (decision === 'approve') {
      await approveAssistant(assistantId);
      return {
        status: 'success',
        message: 'Pago aprobado correctamente.',
        decision,
      };
    }

    await rejectAssistant(assistantId);
    return {
      status: 'success',
      message: 'Pago rechazado correctamente.',
      decision,
    };
  } catch (error) {
    return {
      status: 'error',
      message: formatPaymentReviewError(error, decision),
      decision,
    };
  }
}
