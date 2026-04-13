// src/modules/payments/ui/screens/PaymentPage.tsx
import PaymentStepper from '../PaymentStepper/PaymentStepperComponent';
import {
  EVENT_NOT_AVAILABLE,
  EVENT_REGISTRATION_LOCKED,
  getPaymentPageData,
  PAYMENT_METHOD_NOT_CONFIGURED,
} from '@modules/payments/api/queries/getPaymentPageData';
import { hasEventEnded } from '@modules/events/lib/eventTiming';
import { isVersusEventTypeName } from '@modules/events/lib/eventTypeRules';
import { notFound, redirect } from 'next/navigation';
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
    if (loadError instanceof Error && loadError.message === EVENT_REGISTRATION_LOCKED) {
      redirect(`/events/${id}`);
    }

    if (loadError instanceof Error && loadError.message === EVENT_NOT_AVAILABLE) {
      return (
        <section className="mx-auto w-full max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Próximamente
            </span>
            <h1 className="mt-3 text-2xl font-bold text-[#54086F]">Inscripción temporalmente cerrada</h1>
            <p className="mt-3 text-sm text-slate-700 sm:text-base">
              Este evento no está disponible públicamente por el momento.
            </p>

            <Link
              href="/events"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-btnBg-light px-4 text-sm font-semibold text-btnBg-light transition hover:bg-btnBg-light hover:text-white"
            >
              Volver a eventos
            </Link>
          </div>
        </section>
      );
    }

    if (loadError instanceof Error && loadError.message === PAYMENT_METHOD_NOT_CONFIGURED) {
      return (
        <section className="mx-auto w-full max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Información
            </span>
            <h1 className="mt-3 text-2xl font-bold text-[#54086F]">Pago no disponible</h1>
            <p className="mt-3 text-sm text-slate-700 sm:text-base">
              Este evento aún no tiene métodos de pago configurados.
            </p>
            <p className="mt-2 text-sm text-slate-700 sm:text-base">
              Vuelve en unos minutos o contacta al organizador para habilitar el pago.
            </p>

            <Link
              href={`/events/${id}`}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-btnBg-light px-4 text-sm font-semibold text-btnBg-light transition hover:bg-btnBg-light hover:text-white"
            >
              Volver al evento
            </Link>
          </div>
        </section>
      );
    }

    notFound();
  }

  const { event, paymentMethods, user } = data;
  const eventTypeName = String(
    event?.eventTypeName ?? event?.eventType?.name ?? event?.event_type_name ?? ''
  ).trim();
  const isVersus = isVersusEventTypeName(eventTypeName);
  const rawStartTime = event?.start_time ?? event?.startTime ?? null;
  const rawEndTime = event?.end_time ?? event?.endTime ?? null;
  const isRegistrationClosed = hasEventEnded(rawEndTime, undefined, rawStartTime);

  if (isRegistrationClosed) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Inscripciones cerradas
          </span>
          <h1 className="mt-3 text-2xl font-bold text-[#54086F]">Este evento ya pasó</h1>
          <p className="mt-3 text-sm text-slate-700 sm:text-base">
            Ya no es posible completar el pago para este evento.
          </p>

          <Link
            href={`/events/${id}`}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-btnBg-light px-4 text-sm font-semibold text-btnBg-light transition hover:bg-btnBg-light hover:text-white"
          >
            Volver al evento
          </Link>
        </div>
      </section>
    );
  }

  if (event?.isSoldOut === true) {
    redirect(`/events/${id}`);
  }

  if (isVersus) {
    redirect(`/versus/${id}`);
  }

  return (
    <section className="w-full">
      <PaymentStepper post={event} paymentData={paymentMethods} user={user} />
    </section>
  );
}
