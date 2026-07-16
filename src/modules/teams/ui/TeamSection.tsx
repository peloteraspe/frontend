// src/modules/teams/ui/TeamSection.tsx
'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import TeamCreateModal from './TeamCreateModal';
import type { TeamMembershipSummary } from '@modules/teams/model/types';

type TeamsResponse = {
  teams?: TeamMembershipSummary[];
  error?: string;
};

export default function TeamSection({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [createdTeamName, setCreatedTeamName] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamMembershipSummary[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoadingTeams(true);
      setLoadError(null);

      const res = await fetch('/api/teams', { cache: 'no-store' });
      const json = (await res.json().catch(() => null)) as TeamsResponse | null;

      if (!res.ok) {
        throw new Error(json?.error || 'No se pudieron cargar tus equipos.');
      }

      setTeams(json?.teams ?? []);
    } catch (error) {
      console.error(error);
      setLoadError(
        error instanceof Error ? error.message : 'No se pudieron cargar tus equipos.'
      );
    } finally {
      setLoadingTeams(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  function handleCreated(team: TeamMembershipSummary['team']) {
    setCreatedTeamName(team.name);
    setTeams((currentTeams) => [
      {
        role: 'captain',
        status: 'active',
        joined_at: team.created_at,
        team,
      },
      ...currentTeams.filter((membership) => membership.team.id !== team.id),
    ]);
    loadTeams();
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Mis equipos</h3>
            <p className="mt-1 text-sm text-slate-600">
              Accede a los equipos a los que perteneces y crea los tuyos.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-btnBg-light px-4 py-2.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-btnBg-dark hover:shadow"
          >
            Crear equipo
          </button>
        </div>

        {loadingTeams && (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          </div>
        )}

        {!loadingTeams && loadError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={loadTeams}
              className="mt-3 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold uppercase text-amber-900 hover:bg-amber-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loadingTeams && !loadError && teams.length === 0 && (
          <div className="flex flex-col gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Aún no cuentas con equipos.</p>
              <p className="text-xs text-slate-500">
                Crea uno para que aparezca como card en esta sección.
              </p>
            </div>
          </div>
        )}

        {!loadingTeams && !loadError && teams.length > 0 && (
          <div className="space-y-3">
            {teams.map(({ role, team }) => (
              <Link
                key={team.id}
                href={`/${team.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-[#54086F]/40 hover:bg-[#54086F]/5"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {team.avatar_url ? (
                    <img
                      src={team.avatar_url}
                      alt={`Foto de ${team.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#54086F]/10 text-lg font-bold text-[#54086F]">
                      {team.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{team.name}</p>
                    {role === 'captain' && (
                      <span className="rounded-full bg-[#54086F]/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-[#54086F]">
                        Capitana
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">/{team.slug}</p>
                </div>
                <span className="text-sm font-semibold text-[#54086F] opacity-80 transition-opacity group-hover:opacity-100">
                  Ver
                </span>
              </Link>
            ))}
          </div>
        )}

        {createdTeamName && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {createdTeamName} fue creado correctamente.
          </div>
        )}
      </div>

      <TeamCreateModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
