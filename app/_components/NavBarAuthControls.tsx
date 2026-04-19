'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';
import { useAuth } from '@core/auth/AuthProvider';
import UserImage from '@src/shared/ui/UserImage';

type BrowserWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const UserMenu = dynamic(() => import('./UserMenu'), {
  ssr: false,
  loading: () => (
    <div className="h-11 w-44 animate-pulse rounded-full bg-slate-100/90" aria-hidden="true" />
  ),
});

export default function NavBarAuthControls() {
  const { user, loading } = useAuth();
  const [shouldLoadDesktopMenu, setShouldLoadDesktopMenu] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || shouldLoadDesktopMenu) {
      return undefined;
    }

    if (!window.matchMedia('(min-width: 768px)').matches) {
      return undefined;
    }

    const browserWindow = window as BrowserWindow;
    let idleCallbackId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const loadDesktopMenu = () => {
      if (cancelled) return;

      startTransition(() => {
        setShouldLoadDesktopMenu(true);
      });
    };

    if (typeof browserWindow.requestIdleCallback === 'function') {
      idleCallbackId = browserWindow.requestIdleCallback(loadDesktopMenu, { timeout: 1000 });
    } else {
      timeoutId = setTimeout(loadDesktopMenu, 180);
    }

    return () => {
      cancelled = true;

      if (idleCallbackId !== null && typeof browserWindow.cancelIdleCallback === 'function') {
        browserWindow.cancelIdleCallback(idleCallbackId);
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [shouldLoadDesktopMenu]);

  return (
    <>
      <div className="hidden md:block">
        {shouldLoadDesktopMenu ? (
          <UserMenu user={user} loading={loading} />
        ) : (
          <div className="h-11 w-44 animate-pulse rounded-full bg-slate-100/90" aria-hidden="true" />
        )}
      </div>

      <div className="md:hidden">
        {user ? (
          <Link href="/profile" aria-label="Mi perfil">
            <UserImage
              src={user.avatar_url}
              name={user.username || user.email || 'Usuario'}
            />
          </Link>
        ) : !loading ? (
          <Link
            href="/signUp"
            className="home-button-micro inline-flex h-11 items-center justify-center rounded-full bg-mulberry px-5 text-[0.92rem] font-eastman-bold font-bold tracking-[0.015em] text-white shadow-[0_18px_32px_-24px_rgba(84,8,111,0.72)] hover:bg-[#470760] whitespace-nowrap"
          >
            Regístrate
          </Link>
        ) : null}
      </div>
    </>
  );
}
