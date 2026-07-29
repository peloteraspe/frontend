'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Props = {
  redemptionId: number;
};

export default function CouponReimbursementRequestButton({ redemptionId }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  async function handleRequest() {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/coupons/reimburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redemptionId,
          action: 'request',
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(String(body?.error || 'No se pudo solicitar el abono.'));
        return;
      }

      toast.success('Solicitud enviada a Peloteras.');
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('No se pudo solicitar el abono.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRequest}
      disabled={isSubmitting}
      className="inline-flex min-h-10 min-w-[136px] items-center justify-center gap-2 rounded-xl bg-mulberry px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#470760] focus:outline-none focus:ring-2 focus:ring-mulberry/25 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Solicitar a Peloteras el abono cubierto por el cupón"
    >
      {isSubmitting ? (
        <>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path className="opacity-25" d="M12 2a10 10 0 1 0 10 10" />
            <path className="opacity-90" d="M22 12a10 10 0 0 0-10-10" strokeLinecap="round" />
          </svg>
          Solicitando...
        </>
      ) : (
        'Solicitar abono'
      )}
    </button>
  );
}
