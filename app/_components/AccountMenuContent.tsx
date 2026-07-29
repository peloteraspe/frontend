'use client';

import {
  ArrowRightStartOnRectangleIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  Squares2X2Icon,
  TicketIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import UserImage from '@shared/ui/UserImage';
import type { TeamSummaryRow } from '@modules/teams/model/types';
import { buildPublicTeamPath } from '@shared/lib/publicProfilePaths';
import { handleSameProfileHashNavigation } from './profileHashNavigation';

export type AccountMenuUser = {
  id: string;
  email?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type AccountMenuContentProps = {
  id: string;
  user: AccountMenuUser;
  isAdmin: boolean;
  isSigningOut: boolean;
  pendingInvitationCount?: number;
  featuredTeam?: TeamSummaryRow | null;
  className?: string;
  onNavigate: () => void;
  onSignOut: () => void;
};

type AccountMenuLinkProps = {
  href: string;
  label: string;
  description: string;
  icon: typeof UserCircleIcon;
  onNavigate: () => void;
  badge?: string | null;
};

export function getAccountDisplayName(user: AccountMenuUser) {
  const candidates = [
    user.username,
    user.user_metadata?.username,
    user.user_metadata?.full_name,
    String(user.email || '').split('@')[0],
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }

  return 'Usuario';
}

function AccountMenuLink({
  href,
  label,
  description,
  icon: Icon,
  onNavigate,
  badge = null,
}: AccountMenuLinkProps) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        handleSameProfileHashNavigation(event, href);
        onNavigate();
      }}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-mulberry/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mulberry/30"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-mulberry/10 group-hover:text-mulberry">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="block text-sm font-semibold text-slate-800">{label}</span>
          {badge ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label={`${badge} pendientes`}>
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-4 text-slate-500">{description}</span>
      </span>
    </Link>
  );
}

export function AccountMenuContent({
  id,
  user,
  isAdmin,
  isSigningOut,
  pendingInvitationCount = 0,
  featuredTeam = null,
  className = '',
  onNavigate,
  onSignOut,
}: AccountMenuContentProps) {
  const accountName = getAccountDisplayName(user);
  const accountEmail = String(user.email || '').trim() || 'Sin correo registrado';
  const createEventHref = isAdmin ? '/admin/events/new' : '/create-event';

  return (
    <div
      id={id}
      role="group"
      aria-label="Opciones de cuenta"
      className={`overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.38)] backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <UserImage src={user.avatar_url} name={accountName} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{accountName}</p>
            {isAdmin ? (
              <span className="shrink-0 rounded-full bg-mulberry/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mulberry">
                Admin
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{accountEmail}</p>
        </div>
      </div>

      <div className="my-1 h-px bg-slate-100" aria-hidden="true" />

      {featuredTeam ? (
        <Link
          href={buildPublicTeamPath(featuredTeam.slug)}
          onClick={onNavigate}
          className="mx-1 my-2 flex items-center gap-3 rounded-xl border border-mulberry/15 bg-mulberry/5 p-3 transition-colors hover:bg-mulberry/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mulberry/30"
          aria-label={`Abrir el perfil público de ${featuredTeam.name}, tu equipo destacado`}
        >
          <UserImage src={featuredTeam.avatar_url} name={featuredTeam.name} size={36} />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-mulberry">
              Equipo destacado
            </span>
            <span className="block truncate text-sm font-semibold text-slate-900">
              {featuredTeam.name}
            </span>
          </span>
        </Link>
      ) : null}

      <div className="px-1 py-1">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Tu cuenta
        </p>
        <AccountMenuLink
          href="/profile"
          label="Mi perfil"
          description="Edita tus datos de jugadora"
          icon={UserCircleIcon}
          onNavigate={onNavigate}
        />
        <AccountMenuLink
          href="/convocatorias"
          label="Convocatorias"
          description={
            pendingInvitationCount > 0
              ? `${pendingInvitationCount} pendiente${pendingInvitationCount === 1 ? '' : 's'} de respuesta`
              : 'Revisa invitaciones de equipos'
          }
          icon={BellAlertIcon}
          badge={pendingInvitationCount > 0 ? String(pendingInvitationCount) : null}
          onNavigate={onNavigate}
        />
        <AccountMenuLink
          href={`/tickets/${user.id}`}
          label="Mis entradas"
          description="Consulta tus accesos y códigos QR"
          icon={TicketIcon}
          onNavigate={onNavigate}
        />
        <AccountMenuLink
          href="/profile#mis-equipos"
          label="Mis equipos"
          description="Gestiona los planteles que integras"
          icon={UserGroupIcon}
          onNavigate={onNavigate}
        />
      </div>

      <div className="my-1 h-px bg-slate-100" aria-hidden="true" />

      <div className="px-1 py-1">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Organiza
        </p>
        <AccountMenuLink
          href="/profile#crear-equipo"
          label="Crear equipo"
          description="Arma y publica un nuevo plantel"
          icon={PlusCircleIcon}
          onNavigate={onNavigate}
        />
        <AccountMenuLink
          href={createEventHref}
          label="Crear evento"
          description="Organiza una nueva fecha"
          icon={CalendarDaysIcon}
          onNavigate={onNavigate}
        />
        {isAdmin ? (
          <AccountMenuLink
            href="/admin"
            label="Panel de administración"
            description="Gestiona la operación de Peloteras"
            icon={Squares2X2Icon}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>

      <div className="my-1 h-px bg-slate-100" aria-hidden="true" />

      <button
        type="button"
        onClick={onSignOut}
        disabled={isSigningOut}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-wait disabled:opacity-60"
      >
        <ArrowRightStartOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
        {isSigningOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
    </div>
  );
}
