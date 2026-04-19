import React, { useCallback, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import UserImage from '@src/shared/ui/UserImage';
import { isAdmin as isAdminUser } from '@shared/lib/auth/isAdmin';

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
  const userIsAdmin = Boolean(user && isAdminUser(user as any));
  const createEventHref = userIsAdmin ? '/admin/events/new' : '/create-event';
  const navLinkClassName =
    'hidden lg:inline-flex text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-mulberry/85 transition-colors hover:text-slate-900';
  const authLinkClassName =
    'text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-mulberry/85 transition-colors hover:text-slate-900';
  const authButtonClassName =
    'home-button-micro inline-flex h-11 items-center justify-center rounded-full bg-mulberry px-5 text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-white hover:bg-[#470760] whitespace-nowrap';

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setIsOpen(false);
    window.location.replace('/auth/logout');
  };

  return (
    <div className="relative z-40" ref={ref}>
      <div className="flex flex-row items-center gap-3">
        <div className="flex flex-1 items-center justify-end">
          <div className="flex items-center gap-5">
            {user ? (
              <>
                <Link
                  href={createEventHref}
                  className={navLinkClassName}
                >
                  Crear evento
                </Link>

                {userIsAdmin ? (
                  <Link
                    href="/admin"
                    className={navLinkClassName}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href={`/tickets/${user.id}`}
                    className={navLinkClassName}
                  >
                    Mis entradas
                  </Link>
                )}

                <Link
                  href="/profile"
                  className={navLinkClassName}
                >
                  Mi perfil
                </Link>

                <button
                  type="button"
                  onClick={toggleOpen}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  className="premium-outline inline-flex h-11 items-center justify-center gap-2 rounded-full px-2.5 pl-3 text-xl transition"
                >
                  <UserImage
                    src={user.avatar_url}
                    name={user.username || user.email || 'Usuario'}
                  />
                  <ChevronDownIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </button>
                {isOpen && (
                  <div className="site-panel-soft absolute right-0 top-14 z-20 flex w-64 cursor-pointer flex-col overflow-hidden py-2 text-sm shadow-[0_24px_48px_-30px_rgba(15,23,42,0.28)]">
                    <Link href={'/profile'} className="mx-4 my-2">
                      <p className="text-[0.95rem] font-eastman-bold font-bold leading-none tracking-[0.015em] text-slate-900">
                        {user.username}
                      </p>
                      <p className="mt-1 font-poppins text-[0.8rem] font-medium leading-tight tracking-normal text-slate-500">
                        {user?.email}
                      </p>
                    </Link>
                    <hr className="-mx-1 my-1 h-px bg-muted" />
                    <Link
                      href={`/tickets/${user.id}`}
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-slate-700 transition hover:bg-neutral-100"
                    >
                      Mis entradas
                    </Link>
                    <hr className="-mx-1 my-1 h-px bg-muted" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full px-4 py-3 text-left text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-slate-700 transition hover:bg-neutral-100"
                    >
                      {isSigningOut ? 'Cerrando sesion...' : 'Cerrar sesión'}
                    </button>
                  </div>
                )}
              </>
            ) : loading ? (
              <div className="h-11 w-44 animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
            ) : (
              <>
                <Link href={'/login'} className="hidden sm:inline-flex">
                  <span className={authLinkClassName}>
                    Inicia sesión
                  </span>
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
  );
};

export default UserMenu;
