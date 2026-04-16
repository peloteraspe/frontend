'use client';

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
  const inner = logoSrc ? (
    <Image
      src={logoSrc}
      alt={`Logo de ${name}`}
      width={180}
      height={80}
      className="h-9 w-auto max-w-[120px] object-contain sm:h-10"
    />
  ) : (
    <span className="text-sm font-semibold text-slate-600">{name}</span>
  );

  const baseClass =
    'flex h-full items-center justify-center px-4 py-3 opacity-40 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0';

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
  const [canScrollNext, setCanScrollNext] = useState(allies.length > 1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const update = () => {
      const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
      setCanScrollNext(track.scrollLeft < maxScrollLeft - 4);
    };

    update();
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      track.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [allies.length]);

  return (
    <div className="relative mt-5">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent"
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent transition-opacity duration-300 ${canScrollNext ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />

      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        aria-label="Aliadxs de Peloteras"
      >
        {allies.map((ally) => (
          <div
            key={ally.name}
            className="w-[42%] flex-none snap-start sm:w-[26%] md:w-[20%] lg:w-[16%]"
          >
            <AllyCard name={ally.name} logoSrc={ally.logoSrc} href={ally.href} />
          </div>
        ))}
      </div>
    </div>
  );
}
