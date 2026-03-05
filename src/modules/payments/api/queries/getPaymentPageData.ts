import { getServerSupabase } from '@core/api/supabase.server';

export type PaymentPageData = {
  event: any;
  paymentMethod: any;
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

  const { data: paymentMethod, error: paymentError } = await supabase
    .from('paymentMethod')
    .select('*')
    .eq('event', event.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError || !paymentMethod) {
    throw new Error(PAYMENT_METHOD_NOT_CONFIGURED);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { event, paymentMethod, user } satisfies PaymentPageData;
}
