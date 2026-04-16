'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { startTransition, useEffect, useRef, useState } from 'react';
import type { EventEntity } from '@modules/events/model/types';

type FeaturedEventsClientEntryProps = {
  events: EventEntity[];
  previewCount?: number;
};

type BrowserWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const FeaturedEventsClient = dynamic(() => import('./FeaturedEventsClient'), {
  ssr: false,
  loading: () => <FeaturedEventsFallback />,
});

export default function FeaturedEventsClientEntry({
  events,
  previewCount,
}: FeaturedEventsClientEntryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadInteractiveView, setShouldLoadInteractiveView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || shouldLoadInteractiveView) {
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

    const loadInteractiveView = () => {
      if (cancelled) return;

      startTransition(() => {
        setShouldLoadInteractiveView(true);
      });
    };

    const scheduleLoad = () => {
      if (typeof browserWindow.requestIdleCallback === 'function') {
        idleCallbackId = browserWindow.requestIdleCallback(loadInteractiveView, { timeout: 1200 });
        return;
      }

      timeoutId = setTimeout(loadInteractiveView, 180);
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
        rootMargin: '220px 0px',
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
  }, [shouldLoadInteractiveView]);

  return (
    <div ref={containerRef}>
      {shouldLoadInteractiveView ? (
        <FeaturedEventsClient events={events} previewCount={previewCount} />
      ) : (
        <FeaturedEventsFallback />
      )}
    </div>
  );
}

function FeaturedEventsFallback() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="order-2 space-y-4 xl:order-1">
        {[0, 1, 2].map((index) => (
          <article
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-3 w-20 rounded-full bg-slate-100" />
            <div className="mt-4 h-6 w-3/4 rounded-full bg-slate-100" />
            <div className="mt-3 h-4 w-2/3 rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-1/2 rounded-full bg-slate-100" />
            <div className="mt-5 flex items-center justify-between">
              <div className="h-5 w-16 rounded-full bg-slate-100" />
              <Link
                href="/events"
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"
              >
                Ver eventos
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="order-1 xl:order-2">
        <div className="flex h-[360px] flex-col justify-between rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#faf7fd_0%,#ffffff_100%)] p-5 shadow-sm md:h-[520px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry/60">
              Vista interactiva
            </p>
            <h3 className="mt-3 font-eastman-bold text-xl text-slate-900">
              El mapa y los filtros se activan al llegar a esta sección.
            </h3>
            <p className="mt-3 max-w-[18rem] text-sm leading-6 text-slate-500">
              Priorizamos la primera carga de la home y diferimos esta parte hasta que entre en pantalla.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/80">
            <div>
              <p className="text-sm font-semibold text-slate-900">Explorar eventos</p>
              <p className="text-xs text-slate-500">Lista completa, mapa y detalle por evento.</p>
            </div>
            <Link
              href="/events"
              className="inline-flex h-10 items-center rounded-full bg-mulberry px-4 text-sm font-semibold text-white"
            >
              Abrir
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
