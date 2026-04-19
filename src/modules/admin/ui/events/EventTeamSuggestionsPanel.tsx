'use client';

import type { EventParticipant } from '@modules/admin/api/events/services/eventParticipants.service';
import { suggestBalancedTeams } from '@modules/admin/model/teamSuggestions';

type Props = {
  selectedParticipants: EventParticipant[];
};

function formatLevelScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatRoleCount(label: string, count: number) {
  const normalized = label.toLowerCase();
  if (normalized === 'mediocampo') {
    return `${count} jugadora(s) de mediocampo`;
  }

  if (normalized === 'portera') {
    return `${count} portera${count === 1 ? '' : 's'}`;
  }

  return `${count} ${normalized}${count === 1 ? '' : 's'}`;
}

function formatPositions(positions: string[]) {
  if (!positions.length) return 'Sin posición';
  return positions.join(', ');
}

export default function EventTeamSuggestionsPanel({ selectedParticipants }: Props) {
  if (selectedParticipants.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Equipos sugeridos 6 vs 6</h3>
            <p className="mt-1 text-sm text-slate-600">
              Marca a las jugadoras desde la tabla para generar equipos balanceados por nivel y posición.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Solo superadmin
          </span>
        </div>
      </div>
    );
  }

  const suggestion = suggestBalancedTeams(selectedParticipants);
  const missingRoleSlots = suggestion.missingRoles.reduce((total, role) => total + role.count, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Equipos sugeridos 6 vs 6</h3>
          <p className="mt-1 text-sm text-slate-600">
            La sugerencia usa la selección actual y prioriza balance por nivel con cobertura ideal de posiciones.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-mulberry/10 px-3 py-1 text-xs font-semibold text-mulberry">
          Solo superadmin
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seleccionadas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{suggestion.selectedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titulares sugeridas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{suggestion.starterCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sobrantes</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{suggestion.extraParticipants.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Posiciones por cubrir</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{missingRoleSlots}</p>
        </div>
      </div>

      {suggestion.selectedCount < 12 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Faltan {12 - suggestion.selectedCount} jugadora(s) para completar un 6 vs 6 con 12 titulares.
        </div>
      ) : null}

      {suggestion.missingRoles.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Faltan perfiles para: {suggestion.missingRoles.map((role) => formatRoleCount(role.label, role.count)).join(', ')}.
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          La selección cubre la estructura ideal de posiciones para ambos equipos.
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {suggestion.teams.map((team) => (
          <div key={team.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-base font-semibold text-slate-900">{team.name}</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Nivel total {formatLevelScore(team.totalLevelScore)} · Cobertura ideal {team.matchedSlots}/6
                </p>
              </div>
              {team.adaptedSlots > 0 ? (
                <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {team.adaptedSlots} adaptada(s)
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {team.slots.map((slot) => (
                <div key={slot.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{slot.slotLabel}</p>
                      {slot.player ? (
                        <>
                          <p className="mt-1 font-medium text-slate-900">{slot.player.name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {slot.player.levelName || 'Sin nivel'} · {formatPositions(slot.player.positions)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mt-1 font-medium text-slate-900">Falta jugadora</p>
                          <p className="mt-1 text-sm text-slate-600">
                            No hay ninguna seleccionada para cubrir esta posición todavía.
                          </p>
                        </>
                      )}
                    </div>

                    {slot.player ? (
                      slot.isAdapted ? (
                        <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Adaptada
                        </span>
                      ) : (
                        <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          En rol
                        </span>
                      )
                    ) : (
                      <span className="inline-flex w-fit rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                        Vacante
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {suggestion.extraParticipants.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-900">Sobrantes / suplentes</h4>
          <p className="mt-1 text-sm text-slate-600">
            Estas jugadoras quedaron fuera de los 12 titulares sugeridos y pueden rotar o entrar como suplentes.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {suggestion.extraParticipants.map((participant) => (
              <div key={participant.userId} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-medium text-slate-900">{participant.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {participant.levelName || 'Sin nivel'} · {formatPositions(participant.positions)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
