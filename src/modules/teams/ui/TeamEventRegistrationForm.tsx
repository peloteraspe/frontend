'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { CaptainTeamRegistrationOption } from '@modules/teams/api/services/teamEventRegistration.service';

type Props = {
  event: any;
  teams: CaptainTeamRegistrationOption[];
  paymentMethods: any[];
};

function paymentLabel(type: unknown) {
  const value = String(type || '').toLowerCase();
  if (value.includes('plin') && value.includes('yape')) return 'Yape / Plin';
  if (value.includes('plin')) return 'Plin';
  return 'Yape';
}

export default function TeamEventRegistrationForm({ event, teams, paymentMethods }: Props) {
  const [teamId, setTeamId] = useState<number>(teams[0]?.id ?? 0);
  const selectedTeam = teams.find((team) => team.id === teamId) ?? teams[0] ?? null;
  const [selectedUsersByTeam, setSelectedUsersByTeam] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(teams.map((team) => [team.id, team.members.map((member) => member.userId)]))
  );
  const [operationNumber, setOperationNumber] = useState('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number>(Number(paymentMethods[0]?.id || 0));
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const selectedUsers = selectedTeam ? selectedUsersByTeam[selectedTeam.id] ?? [] : [];
  const priceMode = event?.team_registration_price_mode === 'fixed_team' ? 'fixed_team' : 'per_player';
  const configuredPrice = priceMode === 'fixed_team'
    ? Number(event?.team_registration_fixed_price || 0)
    : Number(event?.price || 0);
  const total = useMemo(
    () => priceMode === 'fixed_team' ? configuredPrice : configuredPrice * selectedUsers.length,
    [configuredPrice, priceMode, selectedUsers.length]
  );
  const minPlayers = Number(event?.team_registration_min_players || 2);
  const maxPlayers = Number(event?.team_registration_max_players || event?.max_users || 999);
  const activeRegistration = selectedTeam?.existingState === 'pending' || selectedTeam?.existingState === 'approved';
  const isVersus = event?.registration_mode === 'team';
  const activeTeamRegistrationCount = Number(event?.activeTeamRegistrationCount || 0);
  const teamRegistrationMaxTeams = Math.max(2, Number(event?.teamRegistrationMaxTeams || event?.team_registration_max_teams || 2));
  const isVersusFull = isVersus && activeTeamRegistrationCount >= teamRegistrationMaxTeams;
  const missingPlayers = Math.max(0, minPlayers - selectedUsers.length);
  const hasTooFewPlayers = Boolean(selectedTeam && !activeRegistration && missingPlayers > 0);
  const selectedPaymentMethod = paymentMethods.find((method) => Number(method.id) === selectedPaymentMethodId) ?? paymentMethods[0];

  function toggleMember(userId: string) {
    if (!selectedTeam || activeRegistration) return;
    setSelectedUsersByTeam((current) => {
      const selected = current[selectedTeam.id] ?? [];
      return {
        ...current,
        [selectedTeam.id]: selected.includes(userId)
          ? selected.filter((id) => id !== userId)
          : [...selected, userId],
      };
    });
  }

  async function submit(eventForm: React.FormEvent) {
    eventForm.preventDefault();
    if (!selectedTeam) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${event.id}/team-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam.id,
          memberUserIds: selectedUsers,
          operationNumber,
          paymentMethodId: selectedPaymentMethodId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'No se pudo registrar el equipo.');
      setCreated(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el equipo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRegistration() {
    if (!selectedTeam?.existingRegistrationId || cancelling) return;
    const confirmed = window.confirm(
      '¿Cancelar toda la inscripción? No habrá devolución y se revocarán las entradas de todas las jugadoras.'
    );
    if (!confirmed) return;
    setCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${event.id}/team-registration`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: selectedTeam.existingRegistrationId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'No se pudo cancelar la inscripción.');
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cancelar la inscripción.');
      setCancelling(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Pago enviado</span>
        <h1 className="mt-4 text-2xl font-bold text-mulberry">Inscripción grupal pendiente de revisión</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Registramos a {selectedUsers.length} jugadoras de {selectedTeam?.name}. Cuando se apruebe el pago, cada una recibirá su propia entrada.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/events/${event.id}`} className="rounded-xl bg-mulberry px-4 py-2.5 text-sm font-semibold text-white">Volver al evento</Link>
          <Link href="/profile#mis-equipos" className="rounded-xl border border-mulberry/25 px-4 py-2.5 text-sm font-semibold text-mulberry">Ver mis equipos</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mulberry">
              {isVersus ? 'Versus de equipos' : 'Inscripción por equipo'}
            </p>
            {isVersus ? (
              <span className="rounded-full bg-mulberry/10 px-3 py-1 text-xs font-semibold text-mulberry">
                {Math.min(activeTeamRegistrationCount, teamRegistrationMaxTeams)}/{teamRegistrationMaxTeams} equipos
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">{event.title}</h1>
          <label className="mt-5 grid gap-1 text-sm font-semibold text-slate-700">
            Equipo
            <select value={teamId} onChange={(e) => setTeamId(Number(e.currentTarget.value))} className="peloteras-form-control h-11 px-3">
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>

          {!selectedTeam ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {event?.viewerHasActiveTeam
                ? 'Solo la capitana puede inscribir al equipo. Coordina con ella para participar.'
                : 'Debes ser capitana de un equipo activo para usar la inscripción grupal.'}
              {!event?.viewerHasActiveTeam ? (
                <Link href="/profile#crear-equipo" className="ml-1 font-semibold underline">Crear equipo</Link>
              ) : null}
            </div>
          ) : activeRegistration ? (
            <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              Este equipo ya tiene una inscripción {selectedTeam.existingState === 'approved' ? 'aprobada' : 'pendiente'} para el evento.
              <p className="mt-2 text-xs leading-5">La cancelación es total, no permite sustituciones ni devoluciones y revoca todas las entradas asociadas.</p>
              <button
                type="button"
                disabled={cancelling}
                onClick={cancelRegistration}
                className="mt-3 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelando…' : 'Cancelar inscripción completa'}
              </button>
            </div>
          ) : isVersusFull ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Este evento ya tiene todos sus lugares para equipos reservados. Si una inscripción es rechazada o
              cancelada, el cupo volverá a estar disponible.
            </div>
          ) : (
            <>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">Jugadoras</h2>
                  <p className="text-xs text-slate-500">Selecciona entre {minPlayers} y {maxPlayers} integrantes activas.</p>
                </div>
                <span className="rounded-full bg-mulberry/10 px-3 py-1 text-xs font-semibold text-mulberry">{selectedUsers.length} seleccionadas</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {selectedTeam.members.map((member) => {
                  const checked = selectedUsers.includes(member.userId);
                  return (
                    <label key={member.membershipId} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${checked ? 'border-mulberry/35 bg-mulberry/5' : 'border-slate-200'}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleMember(member.userId)} className="h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry" />
                      <span className="min-w-0 text-sm font-medium text-slate-800">@{member.username}{member.role === 'captain' ? ' · Capitana' : ''}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {selectedTeam && !activeRegistration && !isVersusFull ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-950">Pago</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((method) => (
                <label key={method.id} className={`rounded-2xl border p-4 ${Number(method.id) === selectedPaymentMethodId ? 'border-mulberry bg-mulberry/5' : 'border-slate-200'}`}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <input type="radio" name="paymentMethod" checked={Number(method.id) === selectedPaymentMethodId} onChange={() => setSelectedPaymentMethodId(Number(method.id))} />
                    {method.name || paymentLabel(method.type)}
                  </span>
                </label>
              ))}
            </div>
            {selectedPaymentMethod ? (
              <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center">
                {typeof selectedPaymentMethod.QR === 'string' && selectedPaymentMethod.QR ? <img src={selectedPaymentMethod.QR.replace(/^\"|\"$/g, '')} alt="Código QR de pago" className="h-36 w-36 rounded-xl object-contain" /> : null}
                <div>
                  <p className="text-sm text-slate-600">Paga el total en {paymentLabel(selectedPaymentMethod.type)}</p>
                  {selectedPaymentMethod.number ? <p className="mt-1 text-lg font-bold text-slate-950">{selectedPaymentMethod.number}</p> : null}
                  <p className="mt-2 text-2xl font-bold text-mulberry">S/ {total.toFixed(2)}</p>
                </div>
              </div>
            ) : null}
            <label className="mt-4 grid gap-1 text-sm font-semibold text-slate-700">
              Número de operación
              <input value={operationNumber} onChange={(e) => setOperationNumber(e.currentTarget.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" pattern="[0-9]{8}" required placeholder="8 dígitos" className="peloteras-form-control h-11 px-3" />
            </label>
          </section>
        ) : null}
      </div>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
        <h2 className="font-semibold text-slate-950">Resumen</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Equipo</dt><dd className="text-right font-semibold">{selectedTeam?.name || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Jugadoras</dt><dd className="font-semibold">{selectedUsers.length}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Modalidad</dt><dd className="text-right font-semibold">{priceMode === 'fixed_team' ? 'Fijo por equipo' : 'Por jugadora'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">{priceMode === 'fixed_team' ? 'Precio del equipo' : 'Precio unitario'}</dt><dd className="font-semibold">S/ {configuredPrice.toFixed(2)}</dd></div>
          <div className="flex justify-between gap-4 border-t border-slate-100 pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-bold text-mulberry">S/ {total.toFixed(2)}</dd></div>
        </dl>
        {hasTooFewPlayers ? (
          <p
            id="team-minimum-feedback"
            role="status"
            aria-live="polite"
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900"
          >
            Para pagar por equipo debes seleccionar al menos {minPlayers} jugadoras. Te {missingPlayers === 1 ? 'falta 1 jugadora' : `faltan ${missingPlayers} jugadoras`}.
          </p>
        ) : null}
        {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button type="submit" aria-describedby={hasTooFewPlayers ? 'team-minimum-feedback' : undefined} disabled={!selectedTeam || activeRegistration || isVersusFull || submitting || hasTooFewPlayers || selectedUsers.length > maxPlayers || !/^[0-9]{8}$/.test(operationNumber) || paymentMethods.length === 0} className="mt-5 h-11 w-full rounded-xl bg-mulberry px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
          {submitting ? 'Registrando…' : 'Enviar pago del equipo'}
        </button>
        <p className="mt-3 text-xs leading-5 text-slate-500">La inscripción completa queda pendiente hasta que administración revise la operación.</p>
      </aside>
    </form>
  );
}
