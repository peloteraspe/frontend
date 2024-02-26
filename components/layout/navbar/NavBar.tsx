'use client';
import Image from 'next/image';
import React from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import UserMenu from './UserMenu';

export const NavBar = ({ user }: any) => {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  if (isLoginPage) {
    return null;
  }

  return (
    <nav className="w-full flex justify-center">
      <div className="w-full lg:mx-32 flex justify-between items-center p-3 text-sm">
          <div className="flex items-center gap-1 h-full" onClick={() => router.push('/')}>
            <Image src="/logo.png" width={50} height={50} alt="Peloteras logo" />
            <span className="font-eastman-extrabold text-2xl text-mulberry uppercase hidden sm:block" >
              Peloteras
            </span>
          </div>
          <UserMenu user={user}/>
      </div>
    </nav>
  );
};
