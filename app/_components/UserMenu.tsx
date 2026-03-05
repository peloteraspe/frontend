import React, { useCallback, useEffect, useRef } from 'react';
import { ButtonM } from '@src/core/ui/Typography';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import UserImage from '@src/shared/ui/UserImage';

type UserLite = {
  id: string;
  email?: string | null;
  username?: string | null;
  email_confirmed_at?: string;
} | null;

interface UserMenuProps {
  user?: UserLite;
  loading?: boolean;
}

const UserMenu: React.FC<UserMenuProps> = ({ user = null, loading = false }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          <div className="flex items-center space-x-8">
            {loading ? (
              // Show login options while loading to prevent empty navbar
              <>
                <Link href={'/login'}>
                  <span className="font-poppins font-semibold text-sm text-mulberry">
                    Inicia sesión
                  </span>
                </Link>
                <Link
                  href="/signUp"
                  className="px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl my-0 mx-2 flex justify-center items-center relative box-border"
                >
                  <ButtonM color="text-white">Unirme a un evento</ButtonM>
                </Link>
              </>
            ) : user ? (
              <>
                <Link
                  href={`/tickets/${user.id}`}
                  className="font-poppins font-semibold text-sm text-mulberry"
                >
                  Mis entradas
                </Link>

                <Link href="/profile" className="font-poppins font-semibold text-sm text-mulberry">
                  Mi perfil
                </Link>

                <button
                  type="button"
                  onClick={toggleOpen}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  className="inline-flex items-center gap-2 justify-center text-xl rounded-full cursor-pointer transition"
                >
                  <UserImage src={''} />
                  <ChevronDownIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </button>
                {isOpen && (
                  <div className="absolute right-0 z-20 w-56 py-2 mt-2 rounded-md shadow-md bg-white overflow-hidden  top-12 text-sm flex flex-col cursor-pointer">
                    <Link href={'/'} className="mx-4 my-2 ">
                      <p className="text-sm  font-semibold leading-none">{user.username}</p>
                      <p className="text-sm leading-none text-muted-foreground">{user?.email}</p>
                    </Link>
                    <hr className="-mx-1 my-1 h-px bg-muted" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="px-4 py-3 w-full text-left hover:bg-neutral-100 transition font-semibold"
                    >
                      {isSigningOut ? 'Cerrando sesion...' : 'Cerrar sesión'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <Link href={'/login'}>
                  <span className="font-poppins font-semibold text-sm text-mulberry">
                    Inicia sesión
                  </span>
                </Link>
                <Link
                  href="/signUp"
                  className="px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl my-0 mx-2 flex justify-center items-center relative box-border"
                >
                  <ButtonM color="text-white">Unirme a un evento</ButtonM>
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
