'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import toast from 'react-hot-toast';

type Props = {
  eventId: number;
  userId: string;
  canMarkAttendance: boolean;
  actionLabel: string;
  actionHint?: string | null;
};

export default function MarkAttendanceButton({
  eventId,
  userId,
  canMarkAttendance,
  actionLabel,
  actionHint,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    if (!canMarkAttendance || isPending) return;

    try {
      const response = await fetch('/api/tickets/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, userId }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        toast.error(payload.message || payload.error || 'No se pudo marcar la asistencia.');
        startTransition(() => {
          router.refresh();
        });
        return;
      }

      toast.success(payload.message || 'Asistencia marcada correctamente.');
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('No se pudo marcar la asistencia.');
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!canMarkAttendance || isPending}
        onClick={handleClick}
        className={`inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
          canMarkAttendance && !isPending
            ? 'bg-mulberry text-white shadow-sm hover:bg-[#470760]'
            : 'cursor-not-allowed bg-slate-200 text-slate-500'
        }`}
      >
        {isPending ? 'Marcando asistencia...' : actionLabel}
      </button>

      {actionHint ? <p className="text-sm text-slate-600">{actionHint}</p> : null}
    </div>
  );
}
