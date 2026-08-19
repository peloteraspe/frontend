import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import type {
  CaptainTeamInvitationCard,
  PublicTeamMember,
  PublicTeamProfile,
} from '@modules/teams/model/types';
import { buildPublicPlayerPath } from '@shared/lib/publicProfilePaths';
import TeamWhatsAppShareButton from '@shared/ui/TeamWhatsAppShareButton';
import TeamInvitationManager from './TeamInvitationManager';
import CaptainTeamInvitationsPanel from './CaptainTeamInvitationsPanel';
import TeamInvitationLinkManager from './TeamInvitationLinkManager';
import TeamManagementPanel from './TeamManagementPanel';
import type { TeamMemberRole } from '@modules/teams/model/types';

type Props = {
  profile: PublicTeamProfile;
  canManageInvitations?: boolean;
  captainInvitations?: CaptainTeamInvitationCard[];
  viewerRole?: TeamMemberRole | null;
  isFeatured?: boolean;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');
}

function getSocialUsername(network: 'instagram' | 'tiktok', value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split('/').filter(Boolean);
      const candidate = network === 'tiktok'
        ? segments.find((segment) => segment.startsWith('@')) || segments[0]
        : segments[0];
      if (candidate) return candidate.replace(/^@+/, '');
    } catch {
      // El valor legado se mostrará sin el prefijo si no puede parsearse como URL.
    }
  }

  return trimmed.replace(/^@+/, '');
}

function getSocialUrl(network: 'instagram' | 'tiktok', value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
      const expectedHostname = network === 'instagram' ? 'instagram.com' : 'tiktok.com';
      if (hostname === expectedHostname) return url.toString();
    } catch {
      // Continúa con el formato normalizado para no generar un enlace roto.
    }
  }

  const cleanUsername = getSocialUsername(network, trimmed);
  return network === 'instagram'
    ? `https://www.instagram.com/${cleanUsername}`
    : `https://www.tiktok.com/@${cleanUsername}`;
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

function MemberAvatar({ member }: { member: PublicTeamMember }) {
  const name = member.username || 'Jugadora';

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-mulberry/15 bg-mulberry/10 text-sm font-bold uppercase text-mulberry">
      {member.avatar_url ? (
        <img src={member.avatar_url} alt={`Foto de @${name}`} className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

function TeamMemberCard({ member, index }: { member: PublicTeamMember; index: number }) {
  const displayName = member.username ? `@${member.username}` : `Jugadora ${index + 1}`;
  const content = (
    <>
      <MemberAvatar member={member} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{displayName}</span>
        <span className="mt-1 block text-xs text-slate-500">
          {member.role === 'captain' ? 'Capitana del equipo' : 'Integrante del equipo'}
        </span>
      </span>
    </>
  );

  return (
    <li>
      {member.username ? (
        <Link
          href={buildPublicPlayerPath(member.username)}
          className="group flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-mulberry/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15"
        >
          {content}
          <span aria-hidden="true" className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-mulberry">
            →
          </span>
        </Link>
      ) : (
        <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
          {content}
        </div>
      )}
    </li>
  );
}

export default function TeamPublicProfilePage({
  profile,
  canManageInvitations = false,
  captainInvitations = [],
  viewerRole = null,
  isFeatured = false,
}: Props) {
  const { team, members, events } = profile;
  const captain = members.find((member) => member.role === 'captain');
  const memberSince = formatMemberSince(team.created_at);
  const hasSocialLinks = Boolean(team.instagram_username || team.tiktok_username);

  return (
    <main className="site-shell w-full py-5 sm:py-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#F8F4FA] px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <p className="whitespace-nowrap text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-mulberry/70 sm:text-xs sm:tracking-[0.16em]">
              Perfil del equipo
            </p>
            <TeamWhatsAppShareButton teamName={team.name} compactOnMobile />
          </div>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-mulberry/10 bg-white text-3xl font-bold text-mulberry shadow-sm sm:h-32 sm:w-32">
              {team.avatar_url ? (
                <img src={team.avatar_url} alt={`Foto de ${team.name}`} className="h-full w-full object-cover" />
              ) : (
                getInitials(team.name)
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-mulberry">@{team.slug}</p>
              <h1 className="mt-1 break-words font-eastman-extrabold text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                {team.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Equipo de fútbol en Peloteras. Conoce a sus integrantes y encuentra sus perfiles públicos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-mulberry/10 bg-mulberry/[0.05] px-3 py-1.5 text-xs font-semibold text-mulberry">
              <UserGroupIcon aria-hidden="true" className="h-4 w-4" />
              {members.length} {members.length === 1 ? 'jugadora' : 'jugadoras'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircleIcon aria-hidden="true" className="h-4 w-4" />
              Equipo activo
            </span>
          </div>
          {canManageInvitations ? <TeamInvitationManager teamId={team.id} /> : null}
        </div>
      </section>

      <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="team-members-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mulberry">Plantel</p>
              <h2 id="team-members-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Jugadoras
              </h2>
              <p className="mt-1 text-sm text-slate-500">Selecciona una jugadora para ver su perfil.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold tabular-nums text-slate-700">
              {members.length}
            </span>
          </div>

          {members.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {members.map((member, index) => (
                <TeamMemberCard key={member.id} member={member} index={index} />
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <UserGroupIcon aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Aún no hay jugadoras visibles</p>
              <p className="mt-1 text-xs text-slate-500">El plantel aparecerá aquí cuando tenga integrantes activas.</p>
            </div>
          )}
          </section>

          {canManageInvitations ? (
            <CaptainTeamInvitationsPanel
              key={captainInvitations
                .map((invitation) => `${invitation.id}:${invitation.status}:${invitation.emailDeliveryStatus}`)
                .join('|')}
              initialInvitations={captainInvitations}
            />
          ) : null}

          {events.length > 0 ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mulberry">Partidos</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Eventos del equipo</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {events.map(({ registrationId, participantCount, event }) => (
                  <Link key={registrationId} href={`/events/${event.id}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-mulberry/30 hover:shadow-sm">
                    <p className="font-semibold text-slate-900">{event.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {event.startTime ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(event.startTime)) : 'Fecha por confirmar'}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-mulberry">{participantCount} inscritas por el equipo</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4">
          {viewerRole ? (
            <TeamManagementPanel team={team} members={members} viewerRole={viewerRole} isFeatured={isFeatured} />
          ) : null}
          {canManageInvitations ? <TeamInvitationLinkManager teamId={team.id} /> : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Acerca del equipo</h2>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
                <dt className="text-slate-500">Capitana</dt>
                <dd className="text-right font-semibold text-slate-800">
                  {captain?.username ? `@${captain.username}` : 'Por confirmar'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-slate-500">Integrantes</dt>
                <dd className="font-semibold tabular-nums text-slate-800">{members.length} / {team.max_members}</dd>
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

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Redes del equipo</h2>
            {hasSocialLinks ? (
              <div className="mt-4 space-y-2">
                {team.instagram_username ? (
                  <a
                    href={getSocialUrl('instagram', team.instagram_username)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold text-slate-700 transition hover:border-mulberry/30 hover:text-mulberry"
                  >
                    <span className="min-w-0 break-all">
                      Instagram · @{getSocialUsername('instagram', team.instagram_username)}
                    </span>
                    <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-4 w-4" />
                  </a>
                ) : null}
                {team.tiktok_username ? (
                  <a
                    href={getSocialUrl('tiktok', team.tiktok_username)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold text-slate-700 transition hover:border-mulberry/30 hover:text-mulberry"
                  >
                    <span className="min-w-0 break-all">
                      TikTok · @{getSocialUsername('tiktok', team.tiktok_username)}
                    </span>
                    <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-500">Este equipo todavía no agregó redes sociales.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
