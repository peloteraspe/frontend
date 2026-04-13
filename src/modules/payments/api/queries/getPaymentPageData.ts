import { getServerSupabase } from '@core/api/supabase.server';
import { getApprovedParticipantsCountByEventId } from '@modules/events/api/queries/getApprovedParticipantsCount';
import { getViewerRegistrationState } from '@modules/events/api/queries/getViewerApprovedRegistrations';
import { getPlacesLeft, isEventSoldOut } from '@modules/events/lib/eventCapacity';
import { getActiveLinkedPaymentMethodIdsForEvent } from '@shared/lib/paymentMethodSelection.server';

export type PaymentPageData = {
  event: any;
  paymentMethods: any[];
  user: any;
};

export const PAYMENT_METHOD_NOT_CONFIGURED = 'PAYMENT_METHOD_NOT_CONFIGURED';
export const EVENT_NOT_AVAILABLE = 'EVENT_NOT_AVAILABLE';
export const EVENT_REGISTRATION_LOCKED = 'EVENT_REGISTRATION_LOCKED';

export async function getPaymentPageData(id: string) {
  const supabase = await getServerSupabase();

  const { data: event, error: eventError } = await supabase
    .from('event')
    .select('*')
    .eq('id', id)
    .single();

  if (eventError || !event) {
    throw new Error('Event not found');
  }

  if (event.is_published === false) {
    throw new Error(EVENT_NOT_AVAILABLE);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerRegistrationState = user?.id ? await getViewerRegistrationState(event.id, supabase, user.id) : null;
  const viewerHasApprovedRegistration = viewerRegistrationState === 'approved';
  const viewerHasPendingRegistration = viewerRegistrationState === 'pending';

  if (viewerHasApprovedRegistration || viewerHasPendingRegistration) {
    throw new Error(EVENT_REGISTRATION_LOCKED);
  }

  let paymentMethodIds: number[] = [];
  try {
    paymentMethodIds = await getActiveLinkedPaymentMethodIdsForEvent(supabase, event.id);
  } catch {
    throw new Error(PAYMENT_METHOD_NOT_CONFIGURED);
  }

  if (paymentMethodIds.length === 0) {
    throw new Error(PAYMENT_METHOD_NOT_CONFIGURED);
  }

  const { data: paymentMethods, error: paymentError } = await supabase
    .from('paymentMethod')
    .select('id,name,QR,number,type,is_active')
    .in('id', paymentMethodIds);

  if (paymentError || !paymentMethods || paymentMethods.length === 0) {
    throw new Error(PAYMENT_METHOD_NOT_CONFIGURED);
  }

  const methodsById = new Map<number, any>();
  paymentMethods.forEach((method) => {
    const id = Number((method as any)?.id);
    if (Number.isInteger(id) && id > 0) {
      methodsById.set(id, method);
    }
  });

  const orderedPaymentMethods = paymentMethodIds
    .map((id) => methodsById.get(id))
    .filter(Boolean);

  if (orderedPaymentMethods.length === 0) {
    throw new Error(PAYMENT_METHOD_NOT_CONFIGURED);
  }

  const approvedCount = await getApprovedParticipantsCountByEventId(event.id, supabase);
  const enrichedEvent = {
    ...event,
    approvedCount,
    placesLeft: getPlacesLeft(event.max_users, approvedCount),
    isSoldOut: isEventSoldOut(event.max_users, approvedCount),
    viewerHasApprovedRegistration,
    viewerHasPendingRegistration,
  };

  return { event: enrichedEvent, paymentMethods: orderedPaymentMethods, user } satisfies PaymentPageData;
}
