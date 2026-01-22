'use client';
import { useCallback, useEffect, useState } from 'react';
import { getBrowserSupabase } from '@src/core/api/supabase.browser';
import Image from 'next/image';
import LogoYape from '../../app/assets/Logo.Yape.webp';
import OperationNumberModal from '../OperationNumberModal';
import operationGuideImage from '../../app/assets/donde-nro-operacion.png';
import Link from 'next/link';
import Input from '../../../../core/ui/Input';
import { ButtonWrapper } from '../../../../core/ui/Button';
import { useRouter } from 'next/navigation';
import soccerBall from '../../app/assets/soccer-ball.svg';
import { useForm } from 'react-hook-form';
import { log } from '@src/core/lib/logger';
import { Title2XL } from '@src/core/ui/Typography';

type FormValues = {
  promCode?: string;
  operationNumber: string;
};

const PaymentStepper = (props: any) => {
  const supabase = getBrowserSupabase();
  const { post, paymentData, user } = props;

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

  // limpiar comillas del QR
  paymentData.QR = paymentData.QR.replace(/^"|"$/g, '');

  const handleApplyPromCode = (data: FormValues) => {
    // Aquí podrías validar el cupón via API. Por ahora, forzamos error de ejemplo:
    setError('promCode', { type: 'manual', message: 'Código inválido o expirado' });
  };

  const handlePaymentConfirmation = async () => {
    const op = getValues('operationNumber');
    // Seguridad extra: valida en handler también
    if (!/^\d{8}$/.test(op)) {
      setError('operationNumber', {
        type: 'manual',
        message: 'El número de operación debe tener 8 dígitos',
      });
      return;
    }

    setCurrentStep(3);

    const registeredPlayer = {
      operationNumber: op,
      event: post.id,
      user: user.id,
      state: 'pending',
    };

    const { error } = await supabase.from('assistants').upsert(registeredPlayer);
    if (error) {
      log.database('UPSERT assistants', 'assistants', error, registeredPlayer);
      setError('operationNumber', {
        type: 'manual',
        message: 'No pudimos registrar tu número. Intenta nuevamente.',
      });
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const StepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="md:grow flex md:flex-row flex-col ">
              <div className="pb-8 md:w-[55%] w-[90%] m-auto">
                <Title2XL>Paga Ahora</Title2XL>
                <div className="text-base flex gap-2 flex-col mt-4">
                  <p>
                    1. Para realizar tu pago, escanea el código QR que se muestra a continuación o
                    utiliza el número:
                  </p>
                  <span className="font-bold text-[20px] text-[#54086F] ml-3">
                    {paymentData?.number}
                  </span>
                  <p>2. Guarda el número de operación.</p>
                  <div className="flex">
                    <button
                      type="button"
                      className="text-[#0EA5E9] hover:underline"
                      onClick={() => setShowModal(true)}
                    >
                      ¿Dónde encuentro mi número de operación?
                    </button>
                  </div>
                  <img
                    className="hidden md:block"
                    src={paymentData?.QR}
                    alt="QR Code"
                    width={200}
                    height={200}
                  />
                </div>
              </div>

              <div className="relative p-3 m-auto h-[50vh] md:h-[70vh] md:w-[35%] w-[90%] rounded-xl bg-[#F4F3F7] border-[#F4F3F7]">
                {/* Form de código promocional */}
                <form
                  className="flex flex-row gap-4 w-full justify-stretch"
                  onSubmit={handleSubmit(handleApplyPromCode)}
                  noValidate
                >
                  <Input
                    label="Código promocional"
                    placeholder="Ingresa tu código promocional"
                    // RHF
                    {...register('promCode')}
                    // UI error
                    errorText={errors.promCode?.message as string | undefined}
                    bgColor="bg-white"
                  />
                  <ButtonWrapper type="submit" width="full">
                    Aplicar
                  </ButtonWrapper>
                </form>

                <div className="text-base flex gap-2 flex-col mt-4">
                  <div className="flex justify-between">
                    <p>Entrada</p>
                    <span className="font-bold text-[20px] text-[#54086F] ml-3">
                      {'S/. '}
                      {parseFloat(post?.price).toFixed(2)}
                    </span>
                  </div>

                  <hr className="border-t border-gray-300 my-4" />
                  <div className="flex justify-between">
                    <p>Total</p>
                    <span className="font-bold text-[20px] text-[#54086F] ml-3">
                      {' S/. '}
                      {parseFloat(post?.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-3 left-0 right-0 mx-auto w-[95%]">
                  <ButtonWrapper type="button" onClick={() => setCurrentStep(2)} width="full">
                    Ya realicé el pago
                  </ButtonWrapper>
                </div>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <div className="md:grow flex flex-col w-full justify-start">
              <div className="pb-8 md:mx-8 mx-4 md:w-[40%] w-[90%]">
                <Title2XL>Verificación</Title2XL>
                <div className="text-base flex gap-2 flex-col mt-4">
                  <p>Ingresa tu número de operación del pago realizado en la app de Yape</p>

                  {/* Form del número de operación */}
                  <form onSubmit={handleSubmit(handlePaymentConfirmation)} noValidate>
                    <Input
                      label="Número de operación"
                      placeholder="Ingresa tu número de operación"
                      // RHF: validación inline (8 dígitos)
                      {...register('operationNumber', {
                        required: 'Por favor, ingresa tu número de operación',
                        pattern: {
                          value: /^\d{8}$/,
                          message: 'El número de operación debe tener 8 dígitos',
                        },
                      })}
                      maxLength={8}
                      errorText={errors.operationNumber?.message as string | undefined}
                    />

                    <div className="flex mt-2">
                      <button
                        type="button"
                        className="text-[#0EA5E9] hover:underline"
                        onClick={() => setShowModal(true)}
                      >
                        ¿Dónde encuentro mi número de operación?
                      </button>
                    </div>

                    <div className="flex flex-row md:w-full w-full mx-auto gap-4 justify-between mt-6">
                      <ButtonWrapper
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        width="full"
                        iconDirection="left"
                        icon={
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
                        }
                      >
                        Regresar
                      </ButtonWrapper>

                      <ButtonWrapper
                        type="submit"
                        width="full"
                        disabled={isSubmitting || !/^\d{8}$/.test(operationNumber || '')}
                      >
                        {isSubmitting ? 'Enviando...' : 'Finalizar'}
                      </ButtonWrapper>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        );

      case 3:
        return loading ? (
          <div className="mb-4 step-content" id="step-4">
            <div className="flex flex-col items-center">
              <Image src={soccerBall} alt="arrow" width={24} height={24} />
              <h2 className="text-lg font-bold text-gray-800 mb-4">Registrando tu asistencia...</h2>
              <p>Por favor, espera mientras confirmamos tu registro.</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 step-content" id="step-4">
              <div className="flex flex-col items-center">
                <Image src={soccerBall} alt="arrow" width={24} height={24} />
                <h2 className="text-lg font-bold text-gray-800 mb-4">¡Ya estás registrada!</h2>
                <div className="flex">
                  <button
                    className="text-[#0EA5E9] hover:underline"
                    onClick={() => router.push(`/tickets/${user.id}`)}
                  >
                    Ver estado de mi entrada
                  </button>
                </div>
                <p>
                  La reserva se completará después de validar el comprobante de pago. Si no
                  coincide, se cancelará la reserva.
                </p>
                <ButtonWrapper
                  onClick={() => router.push(`/`)}
                  width="full"
                  iconDirection="left"
                  icon={
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
                  }
                >
                  Volver al inicio
                </ButtonWrapper>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Error: Paso desconocido</div>;
    }
  };

  return (
    <div className="w-full">
      <div className="w-full px-4 mb-4 mx-4 hidden sm:block">
        <Link className="text-[#54086F] font-medium" href="/">
          <span className="tracking-normal flex gap-2 items-center text-sm text-gray-600 hover:text-[#54086F] transition duration-150 ease-in-out">
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
            Todos los partidos
          </span>
        </Link>
      </div>

      {/* <Stepper step={currentStep} setCurrentStep={setCurrentStep} /> */}
      <div className="w-full">
        <StepContent />
      </div>

      <OperationNumberModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        imageSrc={operationGuideImage}
      />
    </div>
  );
};

export default PaymentStepper;
