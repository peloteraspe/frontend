import React, { useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import UserImage from '@src/shared/ui/UserImage';
import { isAdmin as isAdminUser } from '@shared/lib/auth/isAdmin';
import { AccountMenuContent, getAccountDisplayName } from './AccountMenuContent';
import { usePendingTeamInvitationCount } from '@modules/teams/ui/usePendingTeamInvitationCount';
import { useFeaturedTeam } from '@modules/teams/ui/useFeaturedTeam';

type UserLite = {
  id: string;
  email?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  email_confirmed_at?: string;
  app_metadata?: Record<string, any> | null;
  user_metadata?: Record<string, any> | null;
} | null;

interface UserMenuProps {
  user?: UserLite;
  loading?: boolean;
}

const UserMenu: React.FC<UserMenuProps> = ({ user = null, loading = false }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const userIsAdmin = Boolean(user && isAdminUser(user as any));
  const createEventHref = userIsAdmin ? '/admin/events/new' : '/create-event';
  const accountName = user ? getAccountDisplayName(user) : 'Usuario';
  const pendingInvitationCount = usePendingTeamInvitationCount(Boolean(user));
  const featuredTeam = useFeaturedTeam(Boolean(user));
  const navLinkClassName =
    'hidden lg:inline-flex h-10 items-center rounded-full px-1 text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-mulberry/85 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mulberry/25';
  const createEventClassName =
    'hidden lg:inline-flex h-10 items-center justify-center rounded-full bg-mulberry px-4 text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-white shadow-[0_14px_24px_-18px_rgba(84,8,111,0.75)] transition-colors hover:bg-[#470760] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/20';
  const authLinkClassName =
    'text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-mulberry/85 transition-colors hover:text-slate-900';
  const authButtonClassName =
    'home-button-micro inline-flex h-11 items-center justify-center rounded-full bg-mulberry px-5 text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-white hover:bg-[#470760] whitespace-nowrap';

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setIsOpen(false);
    window.location.replace('/auth/logout');
  };

  return (
    <>
      <div className="relative z-40" ref={ref}>
        <div className="flex flex-row items-center gap-3">
          <div className="flex flex-1 items-center justify-end">
            <div className="flex items-center gap-5">
              {user ? (
                <>
                  <Link href="/events" className={navLinkClassName}>
                    Eventos
                  </Link>

                  <Link
                    href={userIsAdmin ? '/admin' : `/tickets/${user.id}`}
                    className={navLinkClassName}
                  >
                    {userIsAdmin ? 'Administración' : 'Mis entradas'}
                  </Link>

                  <Link href={createEventHref} className={createEventClassName}>
                    Crear evento
                  </Link>

                  <button
                    ref={triggerRef}
                    type="button"
                    onClick={toggleOpen}
                    aria-expanded={isOpen}
                    aria-controls="desktop-account-menu"
                    aria-label={`${isOpen ? 'Cerrar' : 'Abrir'} opciones de la cuenta de ${accountName}`}
                    className="premium-outline relative inline-flex h-11 max-w-[190px] items-center justify-center gap-2 rounded-full py-1 pl-1.5 pr-2.5 text-left transition-colors hover:border-mulberry/25 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15"
                  >
                    {pendingInvitationCount > 0 ? (
                      <span
                        className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                        aria-label={`${pendingInvitationCount} convocatorias pendientes`}
                      >
                        {pendingInvitationCount > 9 ? '9+' : pendingInvitationCount}
                      </span>
                    ) : null}
                    <UserImage src={user.avatar_url} name={accountName} size={34} />
                    <span className="hidden min-w-0 xl:block">
                      <span className="block truncate text-xs font-semibold text-slate-800">
                        {accountName}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                        Mi cuenta
                      </span>
                    </span>
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen ? (
                    <AccountMenuContent
                      id="desktop-account-menu"
                      user={user}
                      isAdmin={userIsAdmin}
                      isSigningOut={isSigningOut}
                      pendingInvitationCount={pendingInvitationCount}
                      featuredTeam={featuredTeam}
                      onNavigate={() => setIsOpen(false)}
                      onSignOut={handleSignOut}
                      className="absolute right-0 top-14 z-20 max-h-[calc(100vh-7rem)] w-[21rem]"
                    />
                  ) : null}
                </>
              ) : loading ? (
                <div className="h-11 w-44 animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
              ) : (
                <>
                  <Link href="/events" className={authLinkClassName}>
                    Pichangas
                  </Link>
                  <Link href="/login" className="hidden sm:inline-flex">
                    <span className={authLinkClassName}>Inicia sesión</span>
                  </Link>
                  <Link href="/signUp" className={authButtonClassName}>
                    Regístrate
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserMenu;
