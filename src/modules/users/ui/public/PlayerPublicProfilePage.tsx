import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { PublicPlayerProfile, PublicPlayerTeam } from '@modules/users/model/types';
import { buildPublicTeamPath } from '@shared/lib/publicProfilePaths';

function getInitials(name: string) {
  return String(name || 'PL').slice(0, 2).toUpperCase();
}

function formatMemberSince(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatted = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function TeamAvatar({ team }: { team: PublicPlayerTeam }) {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-mulberry/15 bg-mulberry/10 text-base font-bold uppercase text-mulberry">
      {team.avatar_url ? (
        <img src={team.avatar_url} alt={`Foto de ${team.name}`} className="h-full w-full object-cover" />
      ) : (
        getInitials(team.name)
      )}
    </span>
  );
}

export default function PlayerPublicProfilePage({ profile }: { profile: PublicPlayerProfile }) {
  const memberSince = formatMemberSince(profile.member_since);
  const primaryPosition = profile.positions[0]?.name ?? null;

  return (
    <main className="site-shell w-full py-5 sm:py-8">
      <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_20px_60px_rgba(84,8,111,0.10)]">
        <div className="relative h-36 overflow-hidden bg-[linear-gradient(125deg,#F0815B_-10%,#B347B1_52%,#54086F_115%)] sm:h-44">
          <div aria-hidden="true" className="absolute -left-10 -top-20 h-52 w-52 rounded-full bg-white/10 blur-xl" />
          <div aria-hidden="true" className="absolute -bottom-20 right-20 h-56 w-56 rounded-full border-[42px] border-white/10" />
        </div>

        <div className="relative px-5 pb-7 sm:px-8 sm:pb-9">
          <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-start">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#F7F1F9] text-3xl font-bold uppercase text-mulberry shadow-lg sm:h-32 sm:w-32">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={`Foto de @${profile.username}`} className="h-full w-full object-cover" />
              ) : (
                getInitials(profile.username)
              )}
            </div>

            <div className="min-w-0 flex-1 sm:pt-20">
              <h1 className="mt-1 break-words font-eastman-extrabold text-[clamp(1.65rem,7vw,2.25rem)] font-extrabold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                @{profile.username}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Jugadora de la comunidad Peloteras. Conoce su perfil deportivo y los equipos de los que forma parte.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.level ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-mulberry/8 px-3 py-1.5 text-xs font-semibold text-mulberry">
                    <ShieldCheckIcon aria-hidden="true" className="h-4 w-4" />
                    Nivel {profile.level}
                  </span>
                ) : null}
                {primaryPosition ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0815B]/10 px-3 py-1.5 text-xs font-semibold text-[#B24C2C]">
                    {primaryPosition}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircleIcon aria-hidden="true" className="h-4 w-4" />
                  Perfil activo
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="player-teams-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mulberry">Comunidad</p>
              <h2 id="player-teams-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Equipos
              </h2>
              <p className="mt-1 text-sm text-slate-500">Equipos activos de los que forma parte.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold tabular-nums text-slate-700">
              {profile.teams.length}
            </span>
          </div>

          {profile.teams.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {profile.teams.map((team) => (
                <li key={team.id}>
                  <Link
                    href={buildPublicTeamPath(team.slug)}
                    className="group flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-mulberry/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15"
                  >
                    <TeamAvatar team={team} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{team.name}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">@{team.slug}</span>
                      {team.role === 'captain' ? (
                        <span className="mt-2 inline-flex rounded-full bg-mulberry/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mulberry">
                          Capitana
                        </span>
                      ) : null}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-mulberry">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <UserGroupIcon aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Aún no tiene equipos visibles</p>
              <p className="mt-1 text-xs text-slate-500">Sus equipos activos aparecerán en esta sección.</p>
            </div>
          )}
        </section>

        <aside>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Perfil deportivo</h2>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
                <dt className="text-slate-500">Nivel</dt>
                <dd className="text-right font-semibold text-slate-800">{profile.level || 'Por definir'}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-slate-500">Posiciones</dt>
                <dd className="max-w-40 text-right font-semibold text-slate-800">
                  {profile.positions.length > 0
                    ? profile.positions.map((position) => position.name).join(', ')
                    : 'Por definir'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-slate-500">Equipos</dt>
                <dd className="font-semibold tabular-nums text-slate-800">{profile.teams.length}</dd>
              </div>
              {memberSince ? (
                <div className="flex items-start justify-between gap-4 py-3 last:pb-0">
                  <dt className="inline-flex items-center gap-1.5 text-slate-500">
                    <CalendarDaysIcon aria-hidden="true" className="h-4 w-4" />
                    En Peloteras
                  </dt>
                  <dd className="text-right font-semibold text-slate-800">Desde {memberSince}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
