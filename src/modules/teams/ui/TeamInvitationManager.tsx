'use client';

import {
  ArrowRightIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { TeamInvitationCandidate } from '@modules/teams/model/types';
import PlayerSearchInput from './PlayerSearchInput';

type CreatedInvitation = {
  id: number;
  username: string | null;
  emailDeliveryStatus: 'sent' | 'failed';
};

type CreateInvitationResponse = {
  invitation?: CreatedInvitation;
  warning?: string | null;
  error?: string;
};

export default function TeamInvitationManager({ teamId }: { teamId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TeamInvitationCandidate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateInvitationResponse | null>(null);

  function close() {
    if (submitting) return;
    setOpen(false);
    setSelected([]);
    setError(null);
    setResult(null);
  }

  async function submit() {
    const candidate = selected[0];
    if (!candidate || submitting) return;

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/teams/${teamId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateUserId: candidate.id }),
      });
      const payload = (await response.json().catch(() => ({}))) as CreateInvitationResponse;

      if (!response.ok || !payload.invitation) {
        throw new Error(payload.error || 'No se pudo crear la convocatoria.');
      }

      setResult(payload);
      setSelected([]);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear la convocatoria.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group relative inline-flex min-h-[3.25rem] w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(135deg,#54086F_0%,#76288C_62%,#8B3B8E_100%)] px-3 py-2.5 text-left text-white shadow-[0_14px_30px_-16px_rgba(84,8,111,0.85)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-16px_rgba(84,8,111,0.95)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/20 sm:w-auto sm:min-w-[15rem]"
      >
        <span
          aria-hidden="true"
          className="absolute -right-7 -top-10 h-24 w-24 rounded-full bg-primary/25 blur-2xl transition duration-300 group-hover:scale-125"
        />
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-inner shadow-white/10">
          <UserPlusIcon aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span aria-hidden="true" className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/65">
            Sumar al plantel
          </span>
          <span className="mt-0.5 block text-sm font-semibold leading-none">Convocar jugadoras</span>
        </span>
        <ArrowRightIcon
          aria-hidden="true"
          className="relative h-4 w-4 shrink-0 text-white/70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white"
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-invitation-title"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <section className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mulberry">
                  Tu equipo
                </p>
                <h2 id="team-invitation-title" className="mt-1 text-2xl font-semibold text-slate-950">
                  Convocar jugadora
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Busca una cuenta existente por @username o por su email exacto.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar convocatoria"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <XMarkIcon aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6">
              <PlayerSearchInput
                teamId={teamId}
                selected={selected}
                onSelect={(candidate) => {
                  setSelected([candidate]);
                  setError(null);
                  setResult(null);
                }}
              />
            </div>

            {result?.invitation ? (
              <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="flex gap-2">
                  <CheckCircleIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      Convocatoria enviada a @{result.invitation.username}
                    </p>
                    {result.warning ? <p className="mt-1 text-amber-800">{result.warning}</p> : null}
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-60"
              >
                {result?.invitation ? 'Cerrar' : 'Cancelar'}
              </button>
              {!result?.invitation ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!selected[0] || submitting}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#54086F_0%,#76288C_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(84,8,111,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-14px_rgba(84,8,111,0.95)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/20 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  <PaperAirplaneIcon
                    aria-hidden="true"
                    className={`h-4 w-4 ${submitting ? 'animate-pulse' : 'transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`}
                  />
                  {submitting ? 'Enviando…' : 'Confirmar convocatoria'}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
