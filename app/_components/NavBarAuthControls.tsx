'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';
import { useAuth } from '@core/auth/AuthProvider';

type BrowserWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const UserMenu = dynamic(() => import('./UserMenu'), {
  ssr: false,
  loading: () => <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />,
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
          <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />
        )}
      </div>

      {!user && !loading ? (
        <div className="md:hidden">
          <Link
            href="/signUp"
            className="rounded-xl bg-btnBg-light px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-btnBg-dark"
          >
            Registrate
          </Link>
        </div>
      ) : null}
    </>
  );
}
