import { getServerSupabase } from '@core/api/supabase.server';
import { getApprovedParticipantsCountByEventId } from '@modules/events/api/queries/getApprovedParticipantsCount';
import { getPlacesLeft, isEventSoldOut } from '@modules/events/lib/eventCapacity';

export type PaymentPageData = {
  event: any;
  paymentMethods: any[];
  user: any;
};

export const PAYMENT_METHOD_NOT_CONFIGURED = 'PAYMENT_METHOD_NOT_CONFIGURED';
export const EVENT_NOT_AVAILABLE = 'EVENT_NOT_AVAILABLE';

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

  const { data: links, error: linksError } = await supabase
    .from('eventPaymentMethod')
    .select('paymentMethod')
    .eq('event', event.id);

  if (linksError) {
    throw new Error(PAYMENT_METHOD_NOT_CONFIGURED);
  }

  const paymentMethodIds = Array.from(
    new Set(
      (links || [])
        .map((row) => Number(row.paymentMethod))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (paymentMethodIds.length === 0) {
    throw new Error(PAYMENT_METHOD_NOT_CONFIGURED);
  }

  const { data: paymentMethods, error: paymentError } = await supabase
    .from('paymentMethod')
    .select('id,name,QR,number,type,is_active')
    .in('id', paymentMethodIds)
    .eq('is_active', true);

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const approvedCount = await getApprovedParticipantsCountByEventId(event.id, supabase);
  const enrichedEvent = {
    ...event,
    approvedCount,
    placesLeft: getPlacesLeft(event.max_users, approvedCount),
    isSoldOut: isEventSoldOut(event.max_users, approvedCount),
  };

  return { event: enrichedEvent, paymentMethods: orderedPaymentMethods, user } satisfies PaymentPageData;
}
