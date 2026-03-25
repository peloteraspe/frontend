'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import {
  submitPaymentReviewAction,
  type PaymentReviewActionState,
  type PaymentReviewDecision,
} from '@modules/admin/api/payments/_actions';

type Props = {
  assistantId: string;
};

const INITIAL_PAYMENT_REVIEW_STATE: PaymentReviewActionState = {
  status: 'idle',
  message: '',
  decision: null,
};

function LoadingSpinner() {
  return (
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
  );
}

function ActionButton({
  decision,
  currentDecision,
  isVisualPending,
  onSelect,
}: {
  decision: PaymentReviewDecision;
  currentDecision: PaymentReviewDecision | null;
  isVisualPending: boolean;
  onSelect: (decision: PaymentReviewDecision) => void;
}) {
  const { pending } = useFormStatus();
  const isCurrentAction = isVisualPending && currentDecision === decision;
  const isApprove = decision === 'approve';

  return (
    <button
      type="submit"
      name="decision"
      value={decision}
      onClick={() => onSelect(decision)}
      disabled={pending}
      className={[
        'inline-flex min-w-[112px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
        isVisualPending
          ? isCurrentAction
            ? isApprove
              ? 'cursor-wait bg-emerald-700 text-white shadow-lg ring-emerald-200'
              : 'cursor-wait bg-rose-700 text-white shadow-lg ring-rose-200'
            : 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
          : isApprove
            ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:ring-emerald-200'
            : 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus:ring-rose-200',
      ].join(' ')}
      aria-disabled={pending}
    >
      {isCurrentAction ? <LoadingSpinner /> : null}
      <span>
        {isCurrentAction ? (isApprove ? 'Aprobando...' : 'Rechazando...') : isApprove ? 'Aprobar' : 'Rechazar'}
      </span>
    </button>
  );
}

function PaymentDecisionFormContent({
  currentDecision,
  onSelectDecision,
  state,
}: {
  currentDecision: PaymentReviewDecision | null;
  onSelectDecision: (decision: PaymentReviewDecision) => void;
  state: PaymentReviewActionState;
}) {
  const { pending } = useFormStatus();
  const isVisualPending = pending || (currentDecision !== null && state.status !== 'error');

  return (
    <div className="inline-flex flex-col items-end gap-2 transition-all duration-200">
      <div className="flex flex-wrap justify-end gap-2">
        <ActionButton
          decision="approve"
          currentDecision={currentDecision}
          isVisualPending={isVisualPending}
          onSelect={onSelectDecision}
        />
        <ActionButton
          decision="reject"
          currentDecision={currentDecision}
          isVisualPending={isVisualPending}
          onSelect={onSelectDecision}
        />
      </div>

      {!pending && state.status === 'error' && state.message ? (
        <p className="max-w-[18rem] text-right text-xs font-medium text-rose-700" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

export default function PaymentDecisionActions({ assistantId }: Props) {
  const router = useRouter();
  const handledSuccessRef = useRef('');
  const [currentDecision, setCurrentDecision] = useState<PaymentReviewDecision | null>(null);
  const [state, formAction] = useActionState(submitPaymentReviewAction, INITIAL_PAYMENT_REVIEW_STATE);

  useEffect(() => {
    if (state.status !== 'success' || !state.message || state.message === handledSuccessRef.current) return;

    handledSuccessRef.current = state.message;
    startTransition(() => {
      router.refresh();
    });
  }, [router, state.message, state.status]);

  return (
    <form action={formAction} className="inline-flex justify-end">
      <input type="hidden" name="assistantId" value={assistantId} readOnly />
      <PaymentDecisionFormContent
        currentDecision={currentDecision}
        onSelectDecision={setCurrentDecision}
        state={state}
      />
    </form>
  );
}
