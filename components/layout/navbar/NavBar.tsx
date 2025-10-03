'use client';
import Image from 'next/image';
import Link from 'next/link';
import UserMenu from './UserMenu';
import { useAuth } from '@/app/provider/AuthProvider';

export const NavBar = ({ simple = false }: { simple?: boolean }) => {
  const { user, loading } = useAuth();

  return (
    <nav className="md:max-w-screen-md lg:max-w-screen-md xl:max-w-screen-xl mx-auto flex justify-between w-full p-4">
      <Link
        href="/"
        className="flex items-center h-full cursor-pointer gap-2"
        aria-label="Ir al inicio"
      >
        <Image src="/logo.png" width={50} height={50} alt="Peloteras logo" />
        <span className="font-eastman-extrabold text-2xl text-mulberry uppercase hidden sm:block">
          Peloteras
        </span>
      </Link>
      {!simple && !loading && <UserMenu user={user} />}
    </nav>
  );
};
