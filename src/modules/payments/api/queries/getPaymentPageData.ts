import { getServerSupabase } from '@core/api/supabase.server';

export type PaymentPageData = {
  event: any;
  paymentMethods: any[];
  user: any;
};

export const PAYMENT_METHOD_NOT_CONFIGURED = 'PAYMENT_METHOD_NOT_CONFIGURED';

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

  return { event, paymentMethods: orderedPaymentMethods, user } satisfies PaymentPageData;
}
