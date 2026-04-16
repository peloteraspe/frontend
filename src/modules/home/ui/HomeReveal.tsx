'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type HomeRevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

export default function HomeReveal({
  children,
  className = '',
  delayMs = 0,
}: HomeRevealProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (mediaQuery.matches) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry?.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -12% 0px',
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={['home-reveal', isVisible ? 'home-reveal-visible' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
