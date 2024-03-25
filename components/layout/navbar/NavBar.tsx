'use client';
import Image from 'next/image';
import React from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import UserMenu from './UserMenu';

export const NavBar = ({ user, simple = false }: any) => {
  const router = useRouter();

  return (
    <nav className="md:max-w-screen-md lg:max-w-screen-md xl:max-w-screen-xl mx-auto flex justify-between w-full p-4 ">
      <div
        className="flex items-center h-full cursor-pointer gap-2"
        onClick={() => router.push('/')}
      >
        <Image src="/logo.png" width={50} height={50} alt="Peloteras logo" />
        <span className="font-eastman-extrabold text-2xl text-mulberry uppercase hidden sm:block">
          Peloteras
        </span>
      </div>
      {!simple && <UserMenu user={user} />}
    </nav>
  );
};
