// components/OperationNumberModal.tsx
import React from 'react';
import Image from 'next/image';

type OperationNumberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: any;
};

const OperationNumberModal = ({ isOpen, onClose, imageSrc }: OperationNumberModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Cerrar"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <h3 className="pr-8 text-lg font-bold text-slate-900">Ubica tu número de operación</h3>
          <p className="mt-1 text-sm text-slate-600">
            Revisa este ejemplo y copia exactamente los 8 dígitos.
          </p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Image src={imageSrc} alt="Número de Operación" width={400} height={300} className="h-auto w-full" />
          </div>
          <div className="mt-4">
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-btnBg-light px-4 text-sm font-semibold text-white transition hover:bg-btnBg-dark"
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
