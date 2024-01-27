// components/OperationNumberModal.tsx
import React from 'react';
import Image from 'next/image';

const OperationNumberModal = ({ isOpen, onClose, imageSrc }: any) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full"
      id="my-modal"
    >
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Ubica tu Número de Operación
          </h3>
          <div className="mt-2 px-7 py-3">
            <Image
              src={imageSrc}
              alt="Número de Operación"
              width={400}
              height={300}
            />
          </div>
          <div className="items-center px-4 py-3">
            <button
              id="ok-btn"
              className="px-4 py-2 bg-indigo-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onClick={onClose}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationNumberModal;
