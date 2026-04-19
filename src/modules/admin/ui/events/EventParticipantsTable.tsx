'use client';

import { useEffect, useRef, useState } from 'react';
import type { EventParticipant } from '@modules/admin/api/events/services/eventParticipants.service';
import EventTeamSuggestionsPanel from '@modules/admin/ui/events/EventTeamSuggestionsPanel';

type Props = {
  participants: EventParticipant[];
  isSuperAdmin: boolean;
};

function stateLabel(state: string) {
  const normalized = String(state || '').trim().toLowerCase();
  if (normalized === 'approved') return 'Aprobada';
  if (normalized === 'pending') return 'Pendiente';
  if (normalized === 'rejected') return 'Rechazada';
  return normalized || 'Sin estado';
}

function stateClasses(state: string) {
  const normalized = String(state || '').trim().toLowerCase();
  if (normalized === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'pending') return 'bg-amber-100 text-amber-700';
  if (normalized === 'rejected') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Sin hora registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin hora registrada';

  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(date);
}

function attendanceLabel(participant: EventParticipant) {
  if (participant.hasAttended) return 'Asistió';
  if (participant.ticketStatus === 'active' || participant.ticketStatus === 'pending') return 'Sin marcar';
  if (participant.ticketStatus === 'revoked') return 'Revocada';
  if (participant.state === 'approved') return 'Sin ticket';
  return 'No registrada';
}

function attendanceClasses(participant: EventParticipant) {
  if (participant.hasAttended) return 'bg-sky-100 text-sky-700';
  if (participant.ticketStatus === 'active' || participant.ticketStatus === 'pending') {
    return 'bg-amber-100 text-amber-700';
  }
  if (participant.ticketStatus === 'revoked') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

function attendanceHint(participant: EventParticipant) {
  if (participant.attendedAt) return formatDateTime(participant.attendedAt);
  if (participant.ticketStatus === 'active') return 'Entrada activa';
  if (participant.ticketStatus === 'pending') return 'Pendiente de emisión';
  if (participant.ticketStatus === 'revoked') return 'Entrada revocada';
  if (participant.state === 'approved') return 'Aún sin entrada';
  return 'Sin ingreso registrado';
}

function getRandomInt(maxExclusive: number) {
  if (maxExclusive <= 0) return 0;

  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    return Math.floor(Math.random() * maxExclusive);
  }

  const maxUint32 = 0x100000000;
  const unbiasedLimit = Math.floor(maxUint32 / maxExclusive) * maxExclusive;
  const randomBuffer = new Uint32Array(1);

  let candidate = 0;
  do {
    globalThis.crypto.getRandomValues(randomBuffer);
    candidate = randomBuffer[0] ?? 0;
  } while (candidate >= unbiasedLimit);

  return candidate % maxExclusive;
}

function pickLotteryWinner(participants: EventParticipant[]) {
  const shuffled = [...participants];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled[0] ?? null;
}

function haveSameParticipantIds(current: string[] | null, next: string[]) {
  if (!current) return false;
  if (current.length !== next.length) return false;

  const currentIds = new Set(current);
  return next.every((id) => currentIds.has(id));
}

export default function EventParticipantsTable({ participants, isSuperAdmin }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generatedTeamIds, setGeneratedTeamIds] = useState<string[] | null>(null);
  const [hasGeneratedTeamsOnce, setHasGeneratedTeamsOnce] = useState(false);
  const [winner, setWinner] = useState<EventParticipant | null>(null);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const participantIds = participants.map((participant) => participant.userId);
  const selectedParticipants = participants.filter((participant) => selectedIds.includes(participant.userId));
  const generatedTeamParticipants = participants.filter((participant) =>
    Boolean(generatedTeamIds?.includes(participant.userId))
  );
  const selectedCount = selectedParticipants.length;
  const allSelected = participants.length > 0 && selectedCount === participants.length;
  const canDraw = isSuperAdmin && selectedCount >= 2;
  const canGenerateTeams = isSuperAdmin && selectedCount >= 1;
  const hasGeneratedTeams = Boolean(generatedTeamIds && generatedTeamIds.length > 0);
  const needsTeamRegeneration = selectedCount > 0 && !hasGeneratedTeams && hasGeneratedTeamsOnce;

  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((id) => participantIds.includes(id));
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });

    setGeneratedTeamIds((current) => {
      if (!current) return current;

      const next = current.filter((id) => participantIds.includes(id));
      if (next.length === 0) return null;
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });
  }, [participants]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [allSelected, selectedCount]);

  useEffect(() => {
    setGeneratedTeamIds((current) => {
      if (!current) return current;
      return haveSameParticipantIds(current, selectedIds) ? current : null;
    });
  }, [selectedIds]);

  useEffect(() => {
    if (!isWinnerModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsWinnerModalOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWinnerModalOpen]);

  function toggleParticipant(userId: string) {
    setSelectedIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }

      return [...current, userId];
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : participantIds);
  }

  function runLottery() {
    if (!canDraw) return;
    const selectedWinner = pickLotteryWinner(selectedParticipants);
    setWinner(selectedWinner);
    setIsWinnerModalOpen(Boolean(selectedWinner));
  }

  function generateTeams() {
    if (!canGenerateTeams) return;
    setGeneratedTeamIds([...selectedIds]);
    setHasGeneratedTeamsOnce(true);
  }

  const emptyColSpan = isSuperAdmin ? 5 : 4;
  const teamStatusText =
    selectedCount === 0
      ? 'Selecciona inscritas para habilitar el sorteo y la generación de equipos.'
      : selectedCount === 1
        ? hasGeneratedTeams
          ? 'Sugerencia generada. Para sortear necesitas 1 inscrita más.'
          : 'Ya puedes generar equipos. Para sortear necesitas 1 inscrita más.'
        : hasGeneratedTeams
          ? 'Equipos sugeridos generados con la selección actual.'
          : needsTeamRegeneration
            ? 'La selección cambió. Genera de nuevo los equipos para actualizar la sugerencia.'
            : 'Listo para sortear y generar equipos con la selección actual.';
  const teamPanelHint =
    selectedCount === 0
      ? 'Selecciona al menos una jugadora y luego haz clic en "Generar equipos".'
      : needsTeamRegeneration
        ? 'La selección cambió. Haz clic en "Generar equipos" para actualizar la sugerencia.'
        : 'Haz clic en "Generar equipos" para ver la sugerencia 6 vs 6 con la selección actual.';

  function renderPlayerProfileHint(participant: EventParticipant) {
    if (!isSuperAdmin) return null;

    const positionText = participant.positions.length > 0 ? participant.positions.join(', ') : 'Sin posición';

    return (
      <div className="mt-1 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {participant.levelName || 'Sin nivel'}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {positionText}
        </span>
      </div>
    );
  }

  return (
    <>
      {isSuperAdmin ? (
        <div className="border-b p-4">
          <div className="space-y-4">
            <div className="rounded-2xl border border-mulberry/15 bg-mulberry/[0.03] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-mulberry">Selección superadmin</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Marca a todas o solo a las jugadoras que quieras usar para sorteo y luego generar equipos.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    disabled={selectedCount === 0}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    Limpiar selección
                  </button>
                  <button
                    type="button"
                    onClick={generateTeams}
                    disabled={!canGenerateTeams}
                    className={[
                      'inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition',
                      canGenerateTeams ? 'bg-mulberry hover:bg-mulberry/90' : 'cursor-not-allowed bg-slate-400',
                    ].join(' ')}
                  >
                    Generar equipos
                  </button>
                  <button
                    type="button"
                    onClick={runLottery}
                    disabled={!canDraw}
                    className={[
                      'inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition',
                      canDraw
                        ? 'border border-mulberry bg-white text-mulberry hover:bg-mulberry/5'
                        : 'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400',
                    ].join(' ')}
                  >
                    Sortear ganadora
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seleccionadas</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{selectedCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total visibles</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{participants.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado actual</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{teamStatusText}</p>
                </div>
              </div>
            </div>

            {hasGeneratedTeams ? (
              <EventTeamSuggestionsPanel selectedParticipants={generatedTeamParticipants} />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Equipos sugeridos 6 vs 6</h3>
                    <p className="mt-1 text-sm text-slate-600">{teamPanelHint}</p>
                  </div>
                  <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Solo superadmin
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {isSuperAdmin ? (
                <th className="px-4 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <input
                      ref={selectAllRef}
                      id="participants-select-all"
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todas las inscritas"
                      className="h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry"
                    />
                    <label htmlFor="participants-select-all" className="cursor-pointer text-xs font-semibold text-slate-600">
                      Todas
                    </label>
                  </div>
                </th>
              ) : null}
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Correo</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 ? (
              <tr className="border-t">
                <td className="px-4 py-4 text-sm text-slate-500" colSpan={emptyColSpan}>
                  Aún no hay inscripciones activas para este evento.
                </td>
              </tr>
            ) : null}

            {participants.map((participant) => {
              const isSelected = selectedIds.includes(participant.userId);

              return (
                <tr
                  key={participant.userId}
                  className={[
                    'border-t transition-colors',
                    isSuperAdmin && isSelected ? 'bg-mulberry/[0.03]' : 'bg-white',
                  ].join(' ')}
                >
                  {isSuperAdmin ? (
                    <td className="px-4 py-2">
                      <input
                        id={`participant-lottery-${participant.userId}`}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleParticipant(participant.userId)}
                        aria-label={`Incluir a ${participant.name} en el sorteo`}
                        className="h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry"
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-2">
                    {isSuperAdmin ? (
                      <label
                        htmlFor={`participant-lottery-${participant.userId}`}
                        className="cursor-pointer font-medium text-slate-900"
                      >
                        {participant.name}
                      </label>
                    ) : (
                      <span className="font-medium text-slate-900">{participant.name}</span>
                    )}
                    {renderPlayerProfileHint(participant)}
                  </td>
                  <td className="px-4 py-2">{participant.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${stateClasses(participant.state)}`}
                    >
                      {stateLabel(participant.state)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${attendanceClasses(
                          participant
                        )}`}
                      >
                        {attendanceLabel(participant)}
                      </span>
                      <span className="text-xs text-slate-500">{attendanceHint(participant)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isWinnerModalOpen && winner ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 px-4 py-4 backdrop-blur-[2px] sm:py-6"
          onClick={() => setIsWinnerModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="participants-lottery-modal-title"
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-left shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setIsWinnerModalOpen(false)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-mulberry/20 bg-mulberry/5 px-4 py-3">
                <p id="participants-lottery-modal-title" className="text-sm font-semibold text-mulberry">
                  Ganadora del sorteo
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Resultado calculado al azar entre las inscritas seleccionadas usando un barajado aleatorio.
                </p>
              </div>

              <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Ganadora</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{winner.name}</p>
                <p className="mt-2 text-sm text-slate-600">{winner.email}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stateClasses(winner.state)}`}>
                    {stateLabel(winner.state)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${attendanceClasses(winner)}`}
                  >
                    {attendanceLabel(winner)}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Participantes del sorteo</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{selectedCount}</p>
                <p className="mt-1 text-sm text-slate-600">Puedes volver a sortear manteniendo la misma selección.</p>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsWinnerModalOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={runLottery}
                  disabled={!canDraw}
                  className={[
                    'inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition',
                    canDraw ? 'bg-mulberry hover:bg-mulberry/90' : 'cursor-not-allowed bg-slate-400',
                  ].join(' ')}
                >
                  Volver a sortear
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
