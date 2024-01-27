"use client";
import { useState } from "react";
import Image from "next/image";
import LogoYape from "../app/assets/Logo.Yape.webp";

const PaymentStepper = (props: any) => {
  const { post } = props;
  const [currentStep, setCurrentStep] = useState(1);

  const StepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="mb-4 step-content" id="step-1">
              {/* <!-- Content for Introduction Step --> */}
              <div className="max-w-6xl mx-auto px-4 sm:px-2 mt-5">
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                  Estas a punto de pagar por el siguiente evento:
                </h2>
                <div className="flex gap-3 items-center">
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
          <>
            {" "}
            <div className="mb-4 step-content " id="step-2">
              {/* <!-- Content for Step 1 --> */}
              <div className="bg-green-200 p-4 rounded">
                <h2>Step 1</h2>
                <p>This is Step 1.</p>
              </div>
            </div>
          </>
        );
      case 3:
        return (
          <>
            {" "}
            <div className="mb-4 step-content " id="step-3">
              {/* <!-- Content for Step 2 --> */}
              <div className="bg-yellow-200 p-4 rounded">
                <h2>Step 2</h2>
                <p>This is Step 2.</p>
              </div>
            </div>
          </>
        );
      default:
        return <></>;
    }
  };

  return (
    <section>
      <div className=" mx-auto px-4 sm:px-6 max-w-7xl w-[350px] h-[600px] md:w-[500px] bg-white p-6 rounded shadow-lg">
        <div className="flex items-center justify-between mb-4 ml-8 mr-8">
          <div
            className={`flex items-center ${
              currentStep >= 1 ? "text-indigo-600" : "text-gray-500"
            }  relative`}
          >
            <div
              className={`step-indicator rounded-full transition duration-500 ease-in-out h-12 w-12 py-3 border-2  ${
                currentStep >= 1 ? "border-indigo-400" : "border-gray-300"
              } `}
            ></div>
            <div
              className={`step-label absolute top-0 -ml-10 text-center mt-16 w-32 text-xs font-medium uppercase  ${
                currentStep >= 1 ? "text-indigo-600" : "text-gray-500"
              } `}
            >
              Detalle de pago
            </div>
          </div>
          <div
            className={`flex-auto border-t-2 transition duration-500 ease-in-out ${
              currentStep > 1 ? "border-indigo-400" : "border-gray-300"
            } `}
          ></div>
          <div className={`flex items-center text-gray-500 relative`}>
            <div
              className={`step-indicator rounded-full transition duration-500 ease-in-out h-12 w-12 py-3 border-2 border-gray-300`}
            ></div>
            <div
              className={`step-label absolute top-0 -ml-10 text-center mt-16 w-32 text-xs font-medium uppercase text-gray-500`}
            >
              Pagar
            </div>
          </div>
          <div
            className={`flex-auto border-t-2 transition duration-500 ease-in-out border-gray-300`}
          ></div>
          <div className={`flex items-center text-gray-500 relative`}>
            <div
              className={`step-indicator rounded-full transition duration-500 ease-in-out h-12 w-12 py-3 border-2 border-gray-300`}
            ></div>
            <div
              className={`step-label absolute top-0 -ml-10 text-center mt-16 w-32 text-xs font-medium uppercase text-gray-500`}
            >
              Confirmar y finalizar
            </div>
          </div>
        </div>
        <div className="relative mt-8 p-4 min-w-[300px]">
          <StepContent />
        </div>
      </div>
    </section>
  );
};

export default PaymentStepper;
