'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { StaticImageData } from 'next/image';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { HomeAlly } from '@modules/home/ui/homeContent';

function AllyCard({
  name,
  logoSrc,
  href,
}: {
  name: string;
  logoSrc: string | StaticImageData;
  href: string;
}) {
  const content = logoSrc ? (
    <Image
      src={logoSrc}
      alt={`Logo de ${name}`}
      width={220}
      height={120}
      className="h-12 w-auto max-w-[150px] object-contain sm:h-14"
    />
  ) : (
    <span className="text-base font-semibold text-slate-700">{name}</span>
  );

  if (!href) {
    return (
      <div className="flex min-h-[116px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-[116px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-mulberry/30 hover:shadow-md"
    >
      {content}
    </a>
  );
}

export default function AlliesCarousel({ allies }: { allies: HomeAlly[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(allies.length > 1);
  const [indicatorWidth, setIndicatorWidth] = useState(100);
  const [indicatorOffset, setIndicatorOffset] = useState(0);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return undefined;
    }

    const updateState = () => {
      const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
      const currentScrollLeft = track.scrollLeft;
      const cards = Array.from(track.children) as HTMLElement[];
      const visibleWidthRatio =
        track.scrollWidth > 0 ? Math.min((track.clientWidth / track.scrollWidth) * 100, 100) : 100;
      const indicatorMaxOffset = Math.max(100 - visibleWidthRatio, 0);
      const nextIndicatorOffset =
        maxScrollLeft > 0 ? (currentScrollLeft / maxScrollLeft) * indicatorMaxOffset : 0;

      setCanScrollPrev(currentScrollLeft > 8);
      setCanScrollNext(currentScrollLeft < maxScrollLeft - 8);
      setIndicatorWidth(visibleWidthRatio);
      setIndicatorOffset(nextIndicatorOffset);

      if (!cards.length) {
        setActiveIndex(0);
        return;
      }

      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const distance = Math.abs(card.offsetLeft - currentScrollLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setActiveIndex(nearestIndex);
    };

    updateState();

    track.addEventListener('scroll', updateState, { passive: true });
    window.addEventListener('resize', updateState);

    return () => {
      track.removeEventListener('scroll', updateState);
      window.removeEventListener('resize', updateState);
    };
  }, [allies.length]);

  const scrollToCard = (direction: -1 | 1) => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const cards = Array.from(track.children) as HTMLElement[];
    if (!cards.length) {
      return;
    }

    const targetIndex = Math.min(Math.max(activeIndex + direction, 0), cards.length - 1);
    const targetCard = cards[targetIndex];

    track.scrollTo({
      left: targetCard.offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {allies.length} marcas y comunidades ya forman parte de esta red.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToCard(-1)}
            disabled={!canScrollPrev}
            aria-label="Ver aliadxs anteriores"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-mulberry/30 hover:text-mulberry disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToCard(1)}
            disabled={!canScrollNext}
            aria-label="Ver más aliadxs"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-mulberry/30 hover:text-mulberry disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-white via-white/90 to-transparent md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-10 bg-gradient-to-l from-white via-white/90 to-transparent md:block" />

        <div
          ref={trackRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          aria-label="Carrusel de aliadxs"
        >
          {allies.map((ally) => (
            <div
              key={ally.name}
              className="w-[82%] flex-none snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[calc(25%-0.75rem)]"
            >
              <AllyCard name={ally.name} logoSrc={ally.logoSrc} href={ally.href} />
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="absolute inset-y-0 rounded-full bg-mulberry transition-[left,width] duration-300 ease-out"
          style={{ left: `${indicatorOffset}%`, width: `${indicatorWidth}%` }}
        />
      </div>
    </div>
  );
}
