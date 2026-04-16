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
      className="inline-flex min-w-[148px] items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? 'Solicitando...' : 'Solicitar a Peloteras'}
    </button>
  );
}
