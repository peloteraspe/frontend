'use client';

import { NavBar } from '@app/_components/NavBar';
import EmailVerificationBanner from '@app/_components/EmailVerificationBanner';
import Footer from '@src/core/ui/Footer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 w-full flex flex-col items-center min-h-screen">
      <EmailVerificationBanner />
      {/* <NavBar /> */}
      {children}
      {/* <Footer /> */}
    </main>
  );
}
