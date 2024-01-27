"use client";
import { useState } from "react";
import Image from "next/image";
import LogoYape from "../app/assets/Logo.Yape.webp";
import { Stepper } from "./Stepper";
import OperationNumberModal from "./OperationNumberModal";
import operationGuideImage from "../app/assets/donde-nro-operacion.png"; // Replace with your image path

const PaymentStepper = (props: any) => {
  const { post, paymentData } = props;
  const [currentStep, setCurrentStep] = useState(1);
  const [operationNumber, setOperationNumber] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handlePaymentConfirmation = () => {
    setCurrentStep(4);
    // Here you can send the operation number to your backend to verify the payment
    // Once the payment is verified, you can redirect the user to a success page
    // or display a success message
  };
  const StepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="mb-4 step-content" id="step-1">
              {/* <!-- Content for Introduction Step --> */}
              <div className="w-[350px] md:w-[450px] h-[500px] max-w-6xl mx-auto px-4 sm:px-2 mt-5">
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                  Estas a punto de pagar por el siguiente evento:
                </h2>
                <div className="flex gap-3 items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-gray-800">
                      Evento: {post.title}
                    </h3>
                    <h2 className=" font-bold text-gray-800">
                      Organizado por: {post.created_by}{" "}
                    </h2>
                  </div>
                  <div className="border-indigo-600 rounded-2xl border-2 h-20 w-20 flex items-center justify-center">
                    <h1 className="text-2xl">s/. {post.price}</h1>
                  </div>
                </div>

                <hr className="my-4" />
                <h1 className="font-bold text-gray-800 text-center">
                  {" "}
                  Paga con yape
                </h1>

                <div className="flex flex-col items-center bg-[#742384] m-auto w-[150px] h-[150px] p-4 rounded-xl mb-4">
                  <Image
                    src={LogoYape}
                    width={100}
                    height={100}
                    alt="yape logo"
                  />
                </div>

                <div className="max-w-xs mx-auto">
                  <button
                    className="btn w-full text-white bg-indigo-500 hover:bg-indigo-600 group shadow-sm"
                    onClick={() => setCurrentStep(2)}
                  >
                    Realizar pago
                    <span className="tracking-normal text-indigo-200 group-hover:translate-x-0.5 transition-transform duration-150 ease-in-out ml-1">
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
                          d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                        />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <div className="mb-4 step-content" id="step-2">
            <div className="w-[350px] md:w-[450px] h-[500px] max-w-6xl mx-auto px-4 sm:px-2 mt-5">
              {/* Display QR Code for Payment */}
              <div className="flex flex-col items-center">
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                  Escanea el siguiente código QR para realizar tu pago:
                </h2>
                {/* Replace src with your dynamic QR code image source */}
                <Image
                  src="/path-to-qr-code.png"
                  width={200}
                  height={200}
                  alt="QR Code"
                />
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                  O realiza el pago a la siguiente cuenta: {paymentData?.number}
                </h2>
                <button
                  className="mt-4 btn w-full text-white bg-indigo-500 hover:bg-indigo-600"
                  onClick={() => setCurrentStep(3)}
                >
                  He realizado el pago
                </button>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="mb-4 step-content" id="step-3">
            {/* Input for Operation Number */}
            <div className="flex flex-col items-center">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Ingresa el número de operación:
              </h2>
              <input
                type="text"
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                className="border p-2 text-center"
                placeholder="Número de operación"
              />
              <div className="flex justify-center">
                <button
                  className="text-blue-500 hover:underline"
                  onClick={() => setShowModal(true)}
                >
                  ¿Dónde encuentro mi número de operación?
                </button>
              </div>
              <button
                className="mt-4 btn w-full text-white bg-indigo-500 hover:bg-indigo-600"
                onClick={handlePaymentConfirmation}
              >
                Confirmar pago
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="mb-4 step-content" id="step-4">
            {/* Final Step for Operation Verification */}
            <div className="flex flex-col items-center">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Verificando el número de operación...
              </h2>
              {/* You could add a spinner or any loading indicator here */}
              <p>Por favor, espera mientras confirmamos tu pago.</p>
              {/* Once the verification is complete, you can update the message or redirect the user */}
            </div>
          </div>
        );
      default:
        return <div>Error: Paso desconocido</div>;
    }
  };

  return (
    <div className="w-[350px] md:w-[500px] h-[600px]">
      <Stepper step={currentStep} setCurrentStep={setCurrentStep} />
      <StepContent />
      <OperationNumberModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        imageSrc={operationGuideImage}
      />
    </div>
  );
};

export default PaymentStepper;
