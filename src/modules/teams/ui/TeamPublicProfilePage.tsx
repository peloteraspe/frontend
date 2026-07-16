import Link from 'next/link';
import type { PublicTeamProfile } from '@modules/teams/model/types';

type Props = {
  profile: PublicTeamProfile;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');
}

function getSocialUrl(network: 'instagram' | 'tiktok', username: string) {
  const cleanUsername = username.replace(/^@+/, '');
  return network === 'instagram'
    ? `https://www.instagram.com/${cleanUsername}`
    : `https://www.tiktok.com/@${cleanUsername}`;
}

function EmptySprintSection({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase text-slate-500">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">Disponible en un siguiente sprint.</p>
    </section>
  );
}

export default function TeamPublicProfilePage({ profile }: Props) {
  const { team, members } = profile;
  const hasSocialLinks = Boolean(team.instagram_username || team.tiktok_username);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/profile"
          className="mb-5 inline-flex text-sm font-semibold text-[#54086F] hover:text-[#3d0652]"
        >
          Volver a mi perfil
        </Link>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-[#54086F]" />
          <div className="px-5 pb-6 sm:px-7">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-sm">
                  {team.avatar_url ? (
                    <img
                      src={team.avatar_url}
                      alt={`Foto de ${team.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#54086F]/10 text-2xl font-bold text-[#54086F]">
                      {getInitials(team.name)}
                    </div>
                  )}
                </div>

                <div className="pb-1">
                  <h1 className="text-3xl font-bold text-slate-950">{team.name}</h1>
                  <p className="mt-1 text-sm text-slate-500">peloteras.com/{team.slug}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pb-1">
                {team.instagram_username && (
                  <a
                    href={getSocialUrl('instagram', team.instagram_username)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-[#54086F]/30 hover:text-[#54086F]"
                  >
                    Instagram
                  </a>
                )}
                {team.tiktok_username && (
                  <a
                    href={getSocialUrl('tiktok', team.tiktok_username)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-[#54086F]/30 hover:text-[#54086F]"
                  >
                    TikTok
                  </a>
                )}
              </div>
            </div>

            {!hasSocialLinks && (
              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Este equipo todavia no agrego redes sociales.
              </p>
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Jugadoras</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Integrantes activas del equipo.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {members.length}
              </span>
            </div>

            {members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                Todavia no hay jugadoras visibles en este equipo.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {members.map((member, index) => {
                  const displayName = member.username
                    ? `@${member.username}`
                    : `Jugadora ${index + 1}`;

                  return (
                    <li key={member.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#54086F]/10 text-sm font-bold text-[#54086F]">
                        {member.username?.slice(0, 1).toUpperCase() ?? 'J'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {displayName}
                        </p>
                        <p className="text-xs text-slate-500">Integrante activa</p>
                      </div>
                      {member.role === 'captain' && (
                        <span className="rounded-full bg-[#54086F]/10 px-2.5 py-1 text-xs font-semibold text-[#54086F]">
                          Capitana
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="space-y-4">
            <EmptySprintSection title="Proximos eventos" />
            <EmptySprintSection title="Historial" />
            <EmptySprintSection title="Convocatorias pendientes" />
          </div>
        </div>
      </div>
    </main>
  );
}
