// src/modules/payments/ui/screens/PaymentPage.tsx
import PaymentStepper from '../PaymentStepper/PaymentStepperComponent';
import {
  getPaymentPageData,
  PAYMENT_METHOD_NOT_CONFIGURED,
} from '@modules/payments/api/queries/getPaymentPageData';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function PaymentPage({ id }: { id: string }) {
  let data: Awaited<ReturnType<typeof getPaymentPageData>> | null = null;
  let loadError: unknown = null;

  try {
    data = await getPaymentPageData(id);
  } catch (error) {
    loadError = error;
  }

  if (!data) {
    if (loadError instanceof Error && loadError.message === PAYMENT_METHOD_NOT_CONFIGURED) {
      return (
        <section className="w-full py-10 px-4 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-[#54086F]">Pago no disponible</h1>
          <p className="mt-3 text-gray-700">
            Este evento aún no tiene un método de pago configurado.
          </p>
          <p className="mt-2 text-gray-700">
            Vuelve en unos minutos o contacta al organizador para habilitar el pago de este evento.
          </p>
          <Link href={`/events/${id}`} className="inline-block mt-6 text-[#0EA5E9] hover:underline">
            Volver al evento
          </Link>
        </section>
      );
    }

    notFound();
  }

  const { event, paymentMethod, user } = data;

  return (
    <section className="w-full">
      <PaymentStepper post={event} paymentData={paymentMethod} user={user} />
    </section>
  );
}
