'use client';

import dynamic from 'next/dynamic';
import { startTransition, useEffect, useState } from 'react';

type BrowserWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const EmailVerificationBanner = dynamic(() => import('@app/_components/EmailVerificationBanner'), {
  ssr: false,
});
const BottomNavigation = dynamic(() => import('@app/_components/BottomNavigation'), {
  ssr: false,
});
const ToastViewport = dynamic(() => import('@app/_components/ToastViewport'), {
  ssr: false,
});

export default function LayoutClientEnhancements() {
  const [shouldLoadEnhancements, setShouldLoadEnhancements] = useState(false);
  const [shouldLoadBottomNavigation, setShouldLoadBottomNavigation] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || shouldLoadEnhancements) {
      return undefined;
    }

    const browserWindow = window as BrowserWindow;
    let idleCallbackId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const loadEnhancements = () => {
      if (cancelled) return;

      startTransition(() => {
        setShouldLoadEnhancements(true);
        setShouldLoadBottomNavigation(window.matchMedia('(max-width: 767px)').matches);
      });
    };

    const scheduleLoad = () => {
      if (typeof browserWindow.requestIdleCallback === 'function') {
        idleCallbackId = browserWindow.requestIdleCallback(loadEnhancements, { timeout: 1200 });
        return;
      }

      timeoutId = setTimeout(loadEnhancements, 220);
    };

    scheduleLoad();
    window.addEventListener('pointerdown', loadEnhancements, { passive: true, once: true });
    window.addEventListener('keydown', loadEnhancements, { once: true });
    window.addEventListener('focus', loadEnhancements, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', loadEnhancements);
      window.removeEventListener('keydown', loadEnhancements);
      window.removeEventListener('focus', loadEnhancements);

      if (idleCallbackId !== null && typeof browserWindow.cancelIdleCallback === 'function') {
        browserWindow.cancelIdleCallback(idleCallbackId);
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [shouldLoadEnhancements]);

  if (!shouldLoadEnhancements) {
    return null;
  }

  return (
    <>
      <EmailVerificationBanner />
      {shouldLoadBottomNavigation ? <BottomNavigation /> : null}
      <ToastViewport />
    </>
  );
}
