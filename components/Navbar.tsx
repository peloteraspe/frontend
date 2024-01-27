'use client';
import Image from 'next/image';
import React from 'react';
import AuthButton from './AuthButton';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

export const Navbar = ({ user }: any) => {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  if (isLoginPage) {
    return null;
  }

  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 text-sm">
        <Image src="/logo.png" width={50} height={50} alt="Peloteras logo" onClick={() => router.push('/')} />
        <AuthButton isLogged={user ? true : false} />
      </div>
    </nav>
  );
};
