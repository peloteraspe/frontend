'use client';

import { startTransition, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitTeamPaymentReviewAction, type PaymentReviewActionState } from '@modules/admin/api/payments/_actions';

const initialState: PaymentReviewActionState = { status: 'idle', message: '', decision: null };

export default function TeamPaymentDecisionActions({ registrationId }: { registrationId: number }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(submitTeamPaymentReviewAction, initialState);
  useEffect(() => {
    if (state.status === 'success') startTransition(() => router.refresh());
  }, [router, state.status]);

  return (
    <form action={action} className="inline-flex w-64 flex-col items-end gap-2">
      <input type="hidden" name="registrationId" value={registrationId} />
      <label className="grid w-full gap-1 text-left text-xs font-medium text-slate-600">
        Motivo del rechazo
        <textarea
          name="reason"
          required
          maxLength={500}
          rows={2}
          placeholder="Obligatorio al rechazar"
          className="peloteras-form-control resize-none px-2 py-1.5 text-xs"
        />
      </label>
      <div className="flex gap-2">
        <button name="decision" value="approve" formNoValidate disabled={pending} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? 'Procesando…' : 'Aprobar grupo'}</button>
        <button name="decision" value="reject" disabled={pending} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Rechazar grupo</button>
      </div>
      {state.status === 'success' ? <p className="max-w-xs text-right text-xs text-emerald-700">{state.message}</p> : null}
      {state.status === 'error' ? <p className="max-w-xs text-right text-xs text-rose-700">{state.message}</p> : null}
    </form>
  );
}
