// src/modules/payments/ui/screens/PaymentPage.tsx
import PaymentStepper from '../PaymentStepper/PaymentStepperComponent';
import { getPaymentPageData } from '@modules/payments/api/queries/getPaymentPageData';
import { notFound } from 'next/navigation';

export default async function PaymentPage({ id }: { id: string }) {
  const data = await getPaymentPageData(id).catch(() => null);
  if (!data) notFound();

  const { event, paymentMethod, user } = data;

  return (
    <section className="w-full">
      <PaymentStepper post={event} paymentData={paymentMethod} user={user} />
    </section>
  );
}
