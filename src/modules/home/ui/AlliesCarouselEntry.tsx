'use client';

import dynamic from 'next/dynamic';
import type { StaticImageData } from 'next/image';
import Image from 'next/image';
import { startTransition, useEffect, useRef, useState } from 'react';
import type { HomeAlly } from '@modules/home/ui/homeContent';

type AlliesCarouselEntryProps = {
  allies: HomeAlly[];
};

type BrowserWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const AlliesCarousel = dynamic(() => import('@modules/home/ui/AlliesCarousel'), {
  ssr: false,
  loading: () => <AlliesCarouselFallback allies={[]} />,
});

export default function AlliesCarouselEntry({ allies }: AlliesCarouselEntryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadCarousel, setShouldLoadCarousel] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || shouldLoadCarousel) {
      return undefined;
    }

    const browserWindow = window as BrowserWindow;
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    let idleCallbackId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const loadCarousel = () => {
      if (cancelled) return;

      startTransition(() => {
        setShouldLoadCarousel(true);
      });
    };

    const scheduleLoad = () => {
      if (typeof browserWindow.requestIdleCallback === 'function') {
        idleCallbackId = browserWindow.requestIdleCallback(loadCarousel, { timeout: 1000 });
        return;
      }

      timeoutId = setTimeout(loadCarousel, 160);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry?.isIntersecting) {
          return;
        }

        observer.disconnect();
        scheduleLoad();
      },
      {
        threshold: 0.1,
        rootMargin: '180px 0px',
      }
    );

    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();

      if (idleCallbackId !== null && typeof browserWindow.cancelIdleCallback === 'function') {
        browserWindow.cancelIdleCallback(idleCallbackId);
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [shouldLoadCarousel]);

  return (
    <div ref={containerRef}>
      {shouldLoadCarousel ? <AlliesCarousel allies={allies} /> : <AlliesCarouselFallback allies={allies} />}
    </div>
  );
}

function getLogoScaleClass(logoSrc: string | StaticImageData) {
  if (typeof logoSrc === 'string') {
    return '';
  }

  const aspectRatio = logoSrc.width / logoSrc.height;

  if (aspectRatio <= 1.1) {
    return 'scale-[1.22] sm:scale-[1.28]';
  }

  if (aspectRatio <= 1.55) {
    return 'scale-110 sm:scale-[1.15]';
  }

  return '';
}

function AlliesCarouselFallback({ allies }: { allies: HomeAlly[] }) {
  const previewAllies = allies.slice(0, 6);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {previewAllies.map((ally) => (
        <a
          key={ally.name}
          href={ally.href || undefined}
          target={ally.href ? '_blank' : undefined}
          rel={ally.href ? 'noreferrer' : undefined}
          className="flex min-h-[84px] items-center justify-center px-4 py-3 opacity-45 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
        >
          <Image
            src={ally.logoSrc}
            alt={`Logo de ${ally.name}`}
            width={180}
            height={80}
            className={`h-9 w-auto max-w-[120px] origin-center object-contain ${getLogoScaleClass(ally.logoSrc)} sm:h-10`}
          />
        </a>
      ))}
    </div>
  );
}
