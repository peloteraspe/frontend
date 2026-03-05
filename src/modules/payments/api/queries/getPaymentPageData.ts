import { getServerSupabase } from '@core/api/supabase.server';

export type PaymentPageData = {
  event: any;
  paymentMethod: any;
  user: any;
};

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

  const { data: eventPaymentMethod, error: paymentError } = await supabase
    .from('paymentMethod')
    .select('*')
    .eq('event', event.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) {
    throw new Error('Payment method query failed');
  }

  let paymentMethod = eventPaymentMethod;

  if (!paymentMethod) {
    const { data: fallbackPaymentMethod, error: fallbackError } = await supabase
      .from('paymentMethod')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackError || !fallbackPaymentMethod) {
      throw new Error('Payment method not found');
    }

    paymentMethod = fallbackPaymentMethod;
  }

  if (!paymentMethod) {
    throw new Error('Payment method not found');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { event, paymentMethod, user } satisfies PaymentPageData;
}
