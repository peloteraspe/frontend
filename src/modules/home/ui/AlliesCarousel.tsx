'use client';

import type { StaticImageData } from 'next/image';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { HomeAlly } from '@modules/home/ui/homeContent';

const AUTO_SCROLL_INTERVAL_MS = 2600;
const AUTO_SCROLL_RESUME_DELAY_MS = 4000;
const EDGE_TOLERANCE_PX = 8;
const LOOP_MULTIPLIER = 3;
const LOOP_NORMALIZE_DELAY_MS = 140;

function getScrollStep(track: HTMLDivElement) {
  const firstCard = track.firstElementChild;

  if (!(firstCard instanceof HTMLElement)) {
    return Math.max(track.clientWidth * 0.4, 120);
  }

  return Math.max(firstCard.getBoundingClientRect().width, 120);
}

function getLoopSpan(track: HTMLDivElement, itemsPerLoop: number) {
  if (itemsPerLoop > 0) {
    const middleStart = track.children.item(itemsPerLoop);
    const finalStart = track.children.item(itemsPerLoop * 2);

    if (middleStart instanceof HTMLElement && finalStart instanceof HTMLElement) {
      return finalStart.offsetLeft - middleStart.offsetLeft;
    }
  }

  return track.scrollWidth / LOOP_MULTIPLIER;
}

function normalizeLoopScroll(track: HTMLDivElement, itemsPerLoop: number) {
  const loopSpan = getLoopSpan(track, itemsPerLoop);

  if (loopSpan <= 0) {
    return;
  }

  while (track.scrollLeft < loopSpan - EDGE_TOLERANCE_PX) {
    track.scrollLeft += loopSpan;
  }

  while (track.scrollLeft >= loopSpan * 2 - EDGE_TOLERANCE_PX) {
    track.scrollLeft -= loopSpan;
  }
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

function AllyCard({
  name,
  logoSrc,
  href,
}: {
  name: string;
  logoSrc: string | StaticImageData;
  href: string;
}) {
  const logoScaleClass = getLogoScaleClass(logoSrc);
  const inner = logoSrc ? (
    <Image
      src={logoSrc}
      alt={`Logo de ${name}`}
      width={200}
      height={96}
      className={`h-12 w-auto max-w-[140px] origin-center object-contain ${logoScaleClass} sm:h-14`}
    />
  ) : (
    <span className="text-base font-semibold text-slate-700">{name}</span>
  );

  const baseClass =
    'mx-auto inline-flex min-h-[100px] w-[calc(100%-0.75rem)] shrink-0 items-center justify-center px-4 py-3 opacity-45 grayscale no-underline outline-none transition duration-300 hover:opacity-100 hover:grayscale-0 focus:outline-none focus-visible:opacity-100';

  if (!href) {
    return <div className={baseClass}>{inner}</div>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={baseClass}>
      {inner}
    </a>
  );
}

export default function AlliesCarousel({ allies }: { allies: HomeAlly[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const autoScrollPausedRef = useRef(false);
  const autoScrollResumeTimeoutRef = useRef<number | null>(null);
  const loopNormalizeTimeoutRef = useRef<number | null>(null);
  const [hasOverflow, setHasOverflow] = useState(allies.length > 1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const shouldLoop = allies.length > 1;
  const renderedAllies = shouldLoop ? [...allies, ...allies, ...allies] : allies;

  const clearAutoScrollResumeTimeout = () => {
    if (autoScrollResumeTimeoutRef.current === null) return;

    window.clearTimeout(autoScrollResumeTimeoutRef.current);
    autoScrollResumeTimeoutRef.current = null;
  };

  const clearLoopNormalizeTimeout = () => {
    if (loopNormalizeTimeoutRef.current === null) return;

    window.clearTimeout(loopNormalizeTimeoutRef.current);
    loopNormalizeTimeoutRef.current = null;
  };

  const pauseAutoScroll = () => {
    autoScrollPausedRef.current = true;
    clearAutoScrollResumeTimeout();
  };

  const resumeAutoScroll = (delayMs = 0) => {
    clearAutoScrollResumeTimeout();

    if (delayMs <= 0) {
      autoScrollPausedRef.current = false;
      return;
    }

    autoScrollResumeTimeoutRef.current = window.setTimeout(() => {
      autoScrollPausedRef.current = false;
      autoScrollResumeTimeoutRef.current = null;
    }, delayMs);
  };

  const scheduleLoopNormalize = () => {
    if (!shouldLoop) {
      return;
    }

    clearLoopNormalizeTimeout();
    loopNormalizeTimeoutRef.current = window.setTimeout(() => {
      const currentTrack = trackRef.current;

      loopNormalizeTimeoutRef.current = null;

      if (!currentTrack) {
        return;
      }

      normalizeLoopScroll(currentTrack, allies.length);
    }, LOOP_NORMALIZE_DELAY_MS);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncTrackLayout = () => {
      const contentWidth = shouldLoop ? getLoopSpan(track, allies.length) : track.scrollWidth;
      const maxScrollLeft = Math.max(contentWidth - track.clientWidth, 0);
      const hasScrollableOverflow = maxScrollLeft > EDGE_TOLERANCE_PX;

      setHasOverflow(hasScrollableOverflow);

      if (!hasScrollableOverflow) {
        clearLoopNormalizeTimeout();
        track.scrollLeft = 0;
        return;
      }

      if (!shouldLoop) {
        return;
      }

      if (track.scrollLeft <= EDGE_TOLERANCE_PX) {
        track.scrollLeft = getLoopSpan(track, allies.length);
        return;
      }

      normalizeLoopScroll(track, allies.length);
    };

    const syncReducedMotionPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    syncTrackLayout();
    syncReducedMotionPreference();

    window.addEventListener('resize', syncTrackLayout);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncReducedMotionPreference);
    } else {
      mediaQuery.addListener(syncReducedMotionPreference);
    }

    return () => {
      clearAutoScrollResumeTimeout();
      clearLoopNormalizeTimeout();
      window.removeEventListener('resize', syncTrackLayout);

      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', syncReducedMotionPreference);
      } else {
        mediaQuery.removeListener(syncReducedMotionPreference);
      }
    };
  }, [allies.length, shouldLoop]);

  useEffect(() => {
    const track = trackRef.current;

    if (!track || !shouldLoop || !hasOverflow) {
      return undefined;
    }

    const handleScroll = () => {
      scheduleLoopNormalize();
    };

    track.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearLoopNormalizeTimeout();
      track.removeEventListener('scroll', handleScroll);
    };
  }, [allies.length, hasOverflow, shouldLoop]);

  useEffect(() => {
    const track = trackRef.current;

    if (!track || prefersReducedMotion || !hasOverflow || !shouldLoop) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const currentTrack = trackRef.current;

      if (!currentTrack || autoScrollPausedRef.current) {
        return;
      }

      const maxScrollLeft = Math.max(getLoopSpan(currentTrack, allies.length) - currentTrack.clientWidth, 0);

      if (maxScrollLeft <= EDGE_TOLERANCE_PX) {
        return;
      }

      normalizeLoopScroll(currentTrack, allies.length);
      const step = getScrollStep(currentTrack);
      currentTrack.scrollBy({ left: step, behavior: 'smooth' });
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [allies.length, hasOverflow, prefersReducedMotion, shouldLoop]);

  return (
    <div
      className="relative mt-5"
      onBlurCapture={() => {
        window.requestAnimationFrame(() => {
          const track = trackRef.current;

          if (!track || track.contains(document.activeElement)) {
            return;
          }

          resumeAutoScroll(AUTO_SCROLL_RESUME_DELAY_MS);
        });
      }}
      onFocusCapture={pauseAutoScroll}
      onMouseEnter={pauseAutoScroll}
      onMouseLeave={() => resumeAutoScroll(1200)}
      onPointerCancel={() => resumeAutoScroll(AUTO_SCROLL_RESUME_DELAY_MS)}
      onPointerDown={pauseAutoScroll}
      onPointerUp={() => resumeAutoScroll(AUTO_SCROLL_RESUME_DELAY_MS)}
      onWheel={() => {
        pauseAutoScroll();
        resumeAutoScroll(AUTO_SCROLL_RESUME_DELAY_MS);
      }}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent transition-opacity duration-300 ${hasOverflow ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent transition-opacity duration-300 ${hasOverflow ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />

      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-proximity overflow-x-auto"
        aria-label="Aliadxs de Peloteras"
      >
        {renderedAllies.map((ally, index) => (
          <div
            key={`${ally.name}-${index}`}
            className="flex w-[42%] flex-none items-center justify-center snap-start sm:w-[26%] md:w-[20%] lg:w-[16%]"
          >
            <AllyCard name={ally.name} logoSrc={ally.logoSrc} href={ally.href} />
          </div>
        ))}
      </div>
    </div>
  );
}
