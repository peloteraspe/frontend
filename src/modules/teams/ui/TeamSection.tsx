// src/modules/teams/ui/TeamSection.tsx
'use client';

import {
  ArrowRightIcon,
  CheckCircleIcon,
  PlusIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import TeamCreateForm from './TeamCreateForm';
import type { TeamMembershipSummary } from '@modules/teams/model/types';
import { buildPublicTeamPath } from '@shared/lib/publicProfilePaths';

type TeamsResponse = {
  teams?: TeamMembershipSummary[];
  error?: string;
};

export default function TeamSection({ currentUserId }: { currentUserId: string }) {
  const [view, setView] = useState<'list' | 'create'>('list');
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

  useEffect(() => {
    function syncViewWithHash() {
      if (window.location.hash === '#crear-equipo') {
        setCreatedTeamName(null);
        setView('create');
      } else if (window.location.hash === '#mis-equipos') {
        setView('list');
      }
    }

    syncViewWithHash();
    window.addEventListener('hashchange', syncViewWithHash);
    return () => window.removeEventListener('hashchange', syncViewWithHash);
  }, []);

  function updateLocationHash(hash: 'mis-equipos' | 'crear-equipo') {
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = hash;
    window.history.replaceState(
      window.history.state,
      '',
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    );
    window.dispatchEvent(new Event('hashchange'));
  }

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
    setView('list');
    updateLocationHash('mis-equipos');
  }

  function startCreatingTeam() {
    setCreatedTeamName(null);
    setView('create');
    updateLocationHash('crear-equipo');
  }

  function showTeamList() {
    setView('list');
    updateLocationHash('mis-equipos');
  }

  if (view === 'create') {
    return <TeamCreateForm onCancel={showTeamList} onCreated={handleCreated} />;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Mis equipos</h2>
            {!loadingTeams && !loadError && (
              <span className="rounded-full bg-mulberry/10 px-2.5 py-0.5 text-xs font-semibold text-mulberry">
                {teams.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Revisa tus planteles o crea un equipo nuevo sin salir de esta página.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreatingTeam}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-btnBg-light px-4 text-sm font-semibold text-white transition-colors hover:bg-btnBg-dark hover:shadow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15"
        >
          <PlusIcon aria-hidden="true" className="h-4 w-4" />
          Nuevo equipo
        </button>
      </div>

      {createdTeamName && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircleIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <strong>{createdTeamName}</strong> fue creado correctamente y ya aparece en tu lista.
          </span>
        </div>
      )}

      {loadingTeams && (
        <div className="grid gap-4 sm:grid-cols-2" aria-label="Cargando equipos" aria-busy="true">
          <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}

      {!loadingTeams && loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={loadTeams}
            className="mt-3 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loadingTeams && !loadError && teams.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mulberry/10 text-mulberry">
            <UserGroupIcon aria-hidden="true" className="h-7 w-7" />
          </div>
          <p className="mt-4 text-base font-semibold text-slate-900">Tu primer equipo empieza aquí</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            Crea su perfil para reunir a tu plantel y compartir una página pública del equipo.
          </p>
          <button
            type="button"
            onClick={startCreatingTeam}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-mulberry/20 bg-white px-4 text-sm font-semibold text-mulberry transition-colors hover:bg-mulberry/5"
          >
            <PlusIcon aria-hidden="true" className="h-4 w-4" />
            Crear mi primer equipo
          </button>
        </div>
      )}

      {!loadingTeams && !loadError && teams.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map(({ role, team, isFeatured }) => (
            <Link
              key={team.id}
              href={buildPublicTeamPath(team.slug)}
              className="group flex min-h-[142px] flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-mulberry/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {team.avatar_url ? (
                    <img
                      src={team.avatar_url}
                      alt={`Foto de ${team.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-mulberry/10 text-lg font-bold text-mulberry">
                      {team.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{team.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">/equipo/@{team.slug}</p>
                  {role === 'captain' && (
                    <span className="mt-2 inline-flex rounded-full bg-mulberry/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mulberry">
                      Capitana
                    </span>
                  )}
                  {isFeatured ? (
                    <span className="ml-1 mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Destacado
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                <p className="min-w-0 truncate text-xs text-slate-500">
                  {team.instagram_username
                    ? `Instagram · @${team.instagram_username}`
                    : team.tiktok_username
                      ? `TikTok · @${team.tiktok_username}`
                      : 'Perfil público del equipo'}
                </p>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-mulberry">
                  Ver perfil
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
