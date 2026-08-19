'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@core/auth/AuthProvider';
import NavBarAuthControls from './NavBarAuthControls';

export const NavBar = ({ simple = false }: { simple?: boolean }) => {
  const { user, loading } = useAuth();
  const hideAuthenticatedMobileNav = !simple && (loading || Boolean(user));

  return (
    <nav
      className={[
        'sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-sm',
        hideAuthenticatedMobileNav ? 'hidden md:block' : '',
      ].join(' ')}
    >
      <div className="site-shell flex min-h-16 items-center justify-between gap-3 py-2">
        <Link
          href="/"
          className="flex h-full shrink-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mulberry/25"
          aria-label="Ir al inicio"
        >
          <Image
            src="/assets/logo.png"
            width={48}
            height={48}
            alt=""
            aria-hidden="true"
            className="h-10 w-10 object-contain sm:hidden"
          />
          <Image
            src="/assets/peloteras.svg"
            width={207}
            height={37}
            alt="Peloteras logo"
            className="hidden h-9 w-auto sm:block"
          />
        </Link>

        {!simple ? <NavBarAuthControls /> : null}
      </div>
    </nav>
  );
};
