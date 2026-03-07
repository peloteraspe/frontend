'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@core/auth/AuthProvider';
import UserMenu from './UserMenu';

export const NavBar = ({ simple = false }: { simple?: boolean }) => {
  const { user, loading } = useAuth();

  return (
    <nav className="mx-auto flex w-full max-w-[1600px] justify-between items-center px-5 py-4 sm:px-8 lg:px-10">
      <Link
        href="/"
        className="flex items-center h-full cursor-pointer gap-2"
        aria-label="Ir al inicio"
      >
        <Image
          src="/assets/peloteras.svg"
          width={207}
          height={37}
          alt="Peloteras logo"
          className="h-10 sm:h-12 w-auto"
        />
      </Link>

      {/* Desktop menu */}
      {!simple && (
        <div className="hidden md:block">
          <UserMenu user={user} loading={loading} />
        </div>
      )}

      {/* Mobile: Mostrar solo CTA principal cuando no hay usuario */}
      {!simple && !user && !loading && (
        <div className="md:hidden">
          <Link
            href="/signUp"
            className="px-3 py-2 bg-btnBg-light hover:bg-btnBg-dark text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Registrate
          </Link>
        </div>
      )}
    </nav>
  );
};
