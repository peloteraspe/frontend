'use client';
import { useState } from 'react';
import Image from 'next/image';
import OperationNumberModal from '../OperationNumberModal';
import operationGuideImage from '@core/assets/images/donde-nro-operacion.png';
import Link from 'next/link';
import Input from '../../../../core/ui/Input';
import { ButtonWrapper } from '../../../../core/ui/Button';
import { useRouter } from 'next/navigation';
import soccerBall from '@core/assets/soccer-ball.svg';
import { useForm } from 'react-hook-form';
import { log } from '@src/core/lib/logger';
import toast from 'react-hot-toast';
import { useAuth } from '@core/auth/AuthProvider';

type FormValues = {
  promCode?: string;
  operationNumber: string;
};

const PAYMENT_CONFIRM_TIMEOUT_MS = 12000;
const OPERATION_NUMBER_REGEX = /^\d{8}$/;

const PaymentStepper = (props: any) => {
  const { post, paymentData, user } = props;
  const paymentQr =
    typeof paymentData?.QR === 'string' ? paymentData.QR.replace(/^"|"$/g, '') : '';
  const paymentNumber = paymentData?.number ?? '';
  const eventTitle = typeof post?.title === 'string' ? post.title : 'Evento';
  const price = Number(post?.price ?? 0);
  const formattedPrice = Number.isFinite(price) ? price.toFixed(2) : '0.00';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    getValues,
    setError,
    clearErrors,
  } = useForm<FormValues>({
    mode: 'onTouched',
    defaultValues: {
      promCode: '',
      operationNumber: '',
    },
  });

  const operationNumber = watch('operationNumber');
  const [currentStep, setCurrentStep] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id ?? user?.id ?? null;
  const isEmailConfirmed = Boolean(authUser?.email_confirmed_at ?? user?.email_confirmed_at);

  const handleApplyPromCode = (_data: FormValues) => {
    // Aquí podrías validar el cupón via API. Por ahora, forzamos error de ejemplo:
    setError('promCode', { type: 'manual', message: 'Código inválido o expirado' });
  };

  const issueTicketInBackground = (assistantId: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    void fetch('/api/tickets/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assistantId }),
      signal: controller.signal,
    })
      .then(async (issueTicketResponse) => {
        if (!issueTicketResponse.ok) {
          const message = await issueTicketResponse.text().catch(() => '');
          log.warn('Ticket issue failed after registration', 'PAYMENTS', {
            assistantId,
            status: issueTicketResponse.status,
            response: message,
          });
        }
      })
      .catch((issueError) => {
        log.warn('Ticket issue request failed', 'PAYMENTS', {
          assistantId,
          issueError,
        });
      })
      .finally(() => {
        clearTimeout(timeout);
      });
  };

  const handlePaymentConfirmation = async () => {
    if (!currentUserId) {
      setError('operationNumber', {
        type: 'manual',
        message: 'Inicia sesión para completar la inscripción.',
      });
      toast.error('Inicia sesión para completar la inscripción.');
      router.push('/login?message=Inicia sesion para completar la inscripcion');
      return;
    }

    if (!isEmailConfirmed) {
      setError('operationNumber', {
        type: 'manual',
        message: 'Verifica tu identidad para completar la inscripcion al evento.',
      });
      toast.error('Verifica tu identidad para completar la inscripcion.');
      return;
    }

    const op = getValues('operationNumber');
    // Seguridad extra: valida en handler también
    if (!OPERATION_NUMBER_REGEX.test(op)) {
      setError('operationNumber', {
        type: 'manual',
        message: 'El número de operación debe tener 8 dígitos',
      });
      return;
    }

    setLoading(true);
    setCurrentStep(3);

    const registeredPlayer = {
      operationNumber: op,
      event: post.id,
      user: currentUserId,
      state: 'pending',
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PAYMENT_CONFIRM_TIMEOUT_MS);

      const registerResponse = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: post.id,
          operationNumber: op,
        }),
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeout);
      });

      if (!registerResponse.ok) {
        const body = await registerResponse.json().catch(() => ({}));
        log.warn('Payment confirm failed', 'PAYMENTS', {
          status: registerResponse.status,
          body,
          registeredPlayer,
        });
        setError('operationNumber', {
          type: 'manual',
          message: 'No pudimos registrar tu número. Intenta nuevamente.',
        });
        setCurrentStep(2);
        return;
      }

      const body = await registerResponse.json().catch(() => ({}));
      const assistantId = Number(body?.assistantId);

      if (!Number.isFinite(assistantId) || assistantId <= 0) {
        log.warn('Payment confirm returned invalid assistantId', 'PAYMENTS', {
          body,
          registeredPlayer,
        });
        setError('operationNumber', {
          type: 'manual',
          message: 'No pudimos registrar tu número. Intenta nuevamente.',
        });
        setCurrentStep(2);
        return;
      }

      issueTicketInBackground(assistantId);
    } catch (error) {
      const isTimeout =
        (error as any)?.name === 'AbortError' ||
        /abort|timed out|timeout/i.test(String((error as any)?.message ?? error));
      if (isTimeout) {
        log.warn('Payment confirm timeout', 'PAYMENTS', {
          registeredPlayer,
          timeoutMs: PAYMENT_CONFIRM_TIMEOUT_MS,
          error,
        });
        setError('operationNumber', {
          type: 'manual',
          message:
            'La confirmación está tardando más de lo normal. Intenta nuevamente en unos segundos.',
        });
        setCurrentStep(2);
        return;
      }

      log.error('Error registering assistant', 'PAYMENTS', {
        error,
        registeredPlayer,
      });
      setError('operationNumber', {
        type: 'manual',
        message: 'No pudimos registrar tu número. Intenta nuevamente.',
      });
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  const StepHeader = () => {
    const steps = [
      { id: 1, label: 'Pago' },
      { id: 2, label: 'Verificación' },
      { id: 3, label: 'Confirmación' },
    ];

    return (
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-6">
        <ol className="flex flex-wrap items-center gap-3 sm:gap-4">
          {steps.map((step) => {
            const isDone = currentStep > step.id;
            const isActive = currentStep === step.id;
            return (
              <li key={step.id} className="flex items-center gap-3">
                <span
                  className={[
                    'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    isDone || isActive
                      ? 'bg-btnBg-light text-white'
                      : 'border border-slate-300 bg-slate-100 text-slate-500',
                  ].join(' ')}
                >
                  {step.id}
                </span>
                <span className={isDone || isActive ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
                  {step.label}
                </span>
                {step.id < steps.length && <span className="hidden h-px w-8 bg-slate-300 sm:block" />}
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  const StepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Paga ahora</h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Completa el pago para reservar tu cupo en el evento.
              </p>

              <ol className="mt-5 space-y-3 text-sm text-slate-700 sm:text-base">
                <li>
                  1. Escanea el código QR o paga al número <strong>{paymentNumber || 'No disponible'}</strong>.
                </li>
                <li>2. Guarda el número de operación de 8 dígitos.</li>
                <li>3. Regresa aquí para confirmar tu pago.</li>
              </ol>

              <button
                type="button"
                className="mt-4 text-sm font-semibold text-sky-600 hover:underline"
                onClick={() => setShowModal(true)}
              >
                ¿Dónde encuentro mi número de operación?
              </button>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {paymentQr ? (
                  <img
                    className="mx-auto h-56 w-56 rounded-xl border border-slate-200 bg-white p-2"
                    src={paymentQr}
                    alt="QR Code"
                    width={224}
                    height={224}
                  />
                ) : (
                  <p className="text-sm text-slate-500">QR no disponible por el momento.</p>
                )}
              </div>
            </section>

            <aside className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Resumen de reserva</h2>
                <p className="mt-1 text-sm text-slate-600">{eventTitle}</p>
              </div>

              <form
                className="mt-5 flex flex-col gap-3 sm:flex-row"
                onSubmit={handleSubmit(handleApplyPromCode)}
                noValidate
              >
                <Input
                  label="Código promocional"
                  placeholder="Ingresa tu código"
                  {...register('promCode')}
                  errorText={errors.promCode?.message as string | undefined}
                  bgColor="bg-white"
                />
                <div className="sm:w-40 sm:pt-7">
                  <ButtonWrapper type="submit" width="full">
                    Aplicar
                  </ButtonWrapper>
                </div>
              </form>

              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <p>Entrada</p>
                  <span className="text-lg font-bold text-[#54086F]">S/. {formattedPrice}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Total</p>
                  <span className="text-xl font-bold text-[#54086F]">S/. {formattedPrice}</span>
                </div>
              </div>

              <div className="mt-6">
                <ButtonWrapper type="button" onClick={() => setCurrentStep(2)} width="full">
                  Ya realicé el pago
                </ButtonWrapper>
              </div>
            </aside>
          </div>
        );

      case 2:
        return (
          <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Verificación</h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Ingresa tu número de operación de Yape para validar el pago.
            </p>

            <form className="mt-5" onSubmit={handleSubmit(handlePaymentConfirmation)} noValidate>
              <Input
                label="Número de operación"
                placeholder="Ingresa los 8 dígitos"
                inputMode="numeric"
                {...register('operationNumber', {
                  required: 'Por favor, ingresa tu número de operación',
                  pattern: {
                    value: OPERATION_NUMBER_REGEX,
                    message: 'El número de operación debe tener 8 dígitos',
                  },
                })}
                maxLength={8}
                errorText={errors.operationNumber?.message as string | undefined}
              />

              <button
                type="button"
                className="mt-2 text-sm font-semibold text-sky-600 hover:underline"
                onClick={() => setShowModal(true)}
              >
                ¿Dónde encuentro mi número de operación?
              </button>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    clearErrors('operationNumber');
                    setCurrentStep(1);
                  }}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-btnBg-light px-4 text-sm font-semibold text-btnBg-light transition hover:bg-btnBg-light hover:text-white"
                >
                  Regresar
                </button>

                <ButtonWrapper
                  type="submit"
                  width="full"
                  disabled={isSubmitting || !OPERATION_NUMBER_REGEX.test(operationNumber || '')}
                >
                  {isSubmitting ? 'Enviando...' : 'Finalizar'}
                </ButtonWrapper>
              </div>
            </form>
          </section>
        );

      case 3:
        return loading ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-pulse">
              <Image src={soccerBall} alt="balón" width={40} height={40} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Registrando tu asistencia...</h2>
            <p className="mt-2 text-sm text-slate-600">
              Por favor, espera mientras confirmamos tu registro.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <div className="mx-auto mb-3 h-10 w-10">
              <Image src={soccerBall} alt="balón" width={40} height={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">¡Ya estás registrada!</h2>
            <p className="mt-3 text-sm text-slate-600">
              La reserva se completará después de validar el comprobante de pago. Si no coincide,
              se cancelará la reserva.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <ButtonWrapper
                onClick={() => {
                  if (!currentUserId) {
                    router.push('/login');
                    return;
                  }
                  router.push(`/tickets/${currentUserId}`);
                }}
                width="full"
              >
                Ver estado de mi entrada
              </ButtonWrapper>
              <button
                type="button"
                onClick={() => router.push(`/`)}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-btnBg-light px-4 text-sm font-semibold text-btnBg-light transition hover:bg-btnBg-light hover:text-white"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        );

      default:
        return <div>Error: Paso desconocido</div>;
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link className="text-[#54086F] font-medium" href={`/events/${post?.id}`}>
          <span className="tracking-normal flex gap-2 items-center text-sm text-gray-600 hover:text-[#54086F] transition duration-150 ease-in-out w-fit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"
              />
            </svg>
            Volver al evento
          </span>
        </Link>
      </div>

      <StepHeader />
      <div className="w-full">{StepContent()}</div>

      <OperationNumberModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        imageSrc={operationGuideImage}
      />
    </div>
  );
};

export default PaymentStepper;
