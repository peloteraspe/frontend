'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@core/auth/AuthProvider';
import UserMenu from './UserMenu';

export const NavBar = ({ simple = false }: { simple?: boolean }) => {
  const { user, loading } = useAuth();

  return (
    <nav className="mx-auto flex w-full max-w-[1600px] justify-between px-5 py-4 sm:px-8 lg:px-10">
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
          className="h-12 w-auto"
        />
      </Link>
      {!simple && <UserMenu user={user} loading={loading} />}
    </nav>
  );
};
