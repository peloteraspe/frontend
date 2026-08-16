'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import type { HeroVerifiedPlayer } from '@modules/home/model/heroVerifiedPlayer';
import HeroPlayerHoverCard from '@modules/home/ui/HeroPlayerHoverCard';
import { buildPublicPlayerPath } from '@shared/lib/publicProfilePaths';

type HeroSoccerBallClientProps = {
  players: HeroVerifiedPlayer[];
};

type HeroSoccerBallFallbackProps = HeroSoccerBallClientProps & {
  showPlayers: boolean;
};

type BrowserWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

type BrowserNavigator = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

const FALLBACK_OUTER_LINES = [
  [122, 178, 173, 118],
  [173, 118, 244, 92],
  [244, 92, 316, 114],
  [316, 114, 372, 170],
  [372, 170, 391, 247],
  [391, 247, 366, 320],
  [366, 320, 305, 373],
  [305, 373, 233, 389],
  [233, 389, 165, 365],
  [165, 365, 118, 307],
  [118, 307, 102, 234],
  [102, 234, 122, 178],
  [173, 118, 208, 174],
  [244, 92, 249, 172],
  [316, 114, 292, 184],
  [372, 170, 312, 220],
  [391, 247, 313, 255],
  [366, 320, 296, 291],
  [305, 373, 249, 314],
  [233, 389, 212, 314],
  [165, 365, 183, 294],
  [118, 307, 186, 251],
  [102, 234, 184, 212],
  [184, 212, 249, 172],
  [249, 172, 312, 220],
  [312, 220, 296, 291],
  [296, 291, 212, 314],
  [212, 314, 186, 251],
  [186, 251, 184, 212],
];

const FALLBACK_INNER_LINES = [
  [168, 206, 220, 158],
  [220, 158, 284, 176],
  [284, 176, 316, 232],
  [316, 232, 290, 292],
  [290, 292, 232, 322],
  [232, 322, 176, 286],
  [176, 286, 168, 206],
  [145, 238, 204, 202],
  [204, 202, 252, 232],
  [252, 232, 241, 292],
  [241, 292, 184, 292],
  [184, 292, 145, 238],
  [232, 140, 270, 226],
  [270, 226, 228, 308],
  [228, 308, 156, 262],
  [200, 140, 176, 218],
  [176, 218, 245, 267],
  [245, 267, 322, 240],
];

const FALLBACK_NODES = [
  [122, 178],
  [173, 118],
  [244, 92],
  [316, 114],
  [372, 170],
  [391, 247],
  [366, 320],
  [305, 373],
  [233, 389],
  [165, 365],
  [118, 307],
  [102, 234],
  [184, 212],
  [249, 172],
  [312, 220],
  [296, 291],
  [212, 314],
  [186, 251],
  [168, 206],
  [220, 158],
  [284, 176],
  [316, 232],
  [290, 292],
  [232, 322],
  [176, 286],
];

const FALLBACK_AVATAR_POSITIONS = [
  [25.5, 36.5],
  [69, 66],
  [65.5, 24.5],
  [25, 55],
  [78, 52],
  [37, 67],
  [51, 19],
  [53, 72],
  [36, 24],
  [76.5, 36],
  [43, 43],
  [59, 50],
] as const;

const HeroSoccerBall = dynamic(() => import('@modules/home/ui/HeroSoccerBall'), {
  ssr: false,
  loading: () => null,
});

export default function HeroSoccerBallClient({ players }: HeroSoccerBallClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad3D, setShouldLoad3D] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);
  const [useStaticFallback, setUseStaticFallback] = useState(false);
  const handle3DReady = useCallback(() => setIs3DReady(true), []);

  useEffect(() => {
    if (typeof window === 'undefined' || shouldLoad3D) {
      return undefined;
    }

    const browserWindow = window as BrowserWindow;
    const browserNavigator = navigator as BrowserNavigator;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = browserNavigator.connection;

    if (mediaQuery.matches || connection?.saveData) {
      setUseStaticFallback(true);
      return undefined;
    }

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let isCancelled = false;
    let idleCallbackId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const load3D = () => {
      if (isCancelled) return;
      startTransition(() => {
        setShouldLoad3D(true);
      });
    };

    const scheduleLoad = () => {
      if (typeof browserWindow.requestIdleCallback === 'function') {
        idleCallbackId = browserWindow.requestIdleCallback(load3D, { timeout: 1400 });
        return;
      }

      timeoutId = setTimeout(load3D, 240);
    };

    if (!('IntersectionObserver' in window)) {
      scheduleLoad();

      return () => {
        isCancelled = true;
        if (idleCallbackId !== null && typeof browserWindow.cancelIdleCallback === 'function') {
          browserWindow.cancelIdleCallback(idleCallbackId);
        }
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      };
    }

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
        threshold: 0.2,
        rootMargin: '160px 0px',
      }
    );

    observer.observe(container);

    return () => {
      isCancelled = true;
      observer.disconnect();
      if (idleCallbackId !== null && typeof browserWindow.cancelIdleCallback === 'function') {
        browserWindow.cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [shouldLoad3D]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[330px] sm:min-h-[400px] lg:min-h-[480px]"
    >
      {shouldLoad3D ? (
        <div
          className={`transition-opacity duration-500 motion-reduce:transition-none ${
            is3DReady ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={!is3DReady}
          inert={!is3DReady}
        >
          <HeroSoccerBall players={players} onReady={handle3DReady} />
        </div>
      ) : null}

      <div
        className={`${
          shouldLoad3D ? 'absolute inset-0' : 'relative'
        } transition-opacity duration-500 motion-reduce:transition-none ${
          is3DReady ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        aria-hidden={is3DReady}
        inert={is3DReady}
      >
        <HeroSoccerBallFallback players={players} showPlayers={useStaticFallback} />
      </div>
    </div>
  );
}

function HeroSoccerBallFallback({ players, showPlayers }: HeroSoccerBallFallbackProps) {
  const displayedPlayers = showPlayers
    ? [
        ...players.filter((player) => player.profileHandle),
        ...players.filter((player) => !player.profileHandle),
      ].slice(0, FALLBACK_AVATAR_POSITIONS.length)
    : [];

  return (
    <div className="relative flex min-h-[330px] w-full items-center justify-center sm:min-h-[400px] lg:min-h-[480px]">
      <div
        className={`pointer-events-none absolute inset-[19%] rounded-full bg-[radial-gradient(circle_at_center,rgba(240,129,91,0.1),rgba(84,8,111,0.05)_54%,rgba(255,255,255,0)_76%)] blur-2xl ${
          showPlayers ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="relative aspect-square w-full max-w-[23rem] sm:max-w-[27rem] lg:max-w-[30rem]">
        <svg
          viewBox="0 0 480 480"
          className="h-full w-full"
          role="img"
          aria-label="Red de jugadoras inscritas en Peloteras"
        >
          <defs>
            <radialGradient id="hero-orb" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F0815B" stopOpacity="0.08" />
              <stop offset="58%" stopColor="#54086F" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle
            cx="240"
            cy="240"
            r="164"
            fill="url(#hero-orb)"
            opacity={showPlayers ? 1 : 0}
          />
          <circle
            cx="240"
            cy="240"
            r="156"
            fill="none"
            stroke="#F9BDAF"
            strokeOpacity={showPlayers ? 0.24 : 0}
            strokeWidth="1"
          />

          <g opacity={showPlayers ? 0.34 : 0}>
            {FALLBACK_OUTER_LINES.filter((_, index) => index % 2 === 0).map(([x1, y1, x2, y2]) => (
              <line
                key={`outer-${x1}-${y1}-${x2}-${y2}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#F9BDAF"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            ))}
          </g>

          <g opacity={showPlayers ? 0.2 : 0}>
            {FALLBACK_INNER_LINES.filter((_, index) => index % 2 === 0).map(([x1, y1, x2, y2]) => (
              <line
                key={`inner-${x1}-${y1}-${x2}-${y2}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#744D7C"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            ))}
          </g>

          {showPlayers ? (
            <g>
              {FALLBACK_NODES.filter((_, index) => index % 2 === 0).map(([cx, cy], index) => (
                <circle
                  key={`node-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={index % 5 === 0 ? 2.5 : 2}
                  fill={index % 4 === 0 ? '#F0815B' : '#FFF7F2'}
                  opacity="0.78"
                />
              ))}
            </g>
          ) : null}
        </svg>

        {displayedPlayers.length > 0 ? (
          <div
            className="pointer-events-none absolute inset-0"
            role="group"
            aria-label="Perfiles de jugadoras"
          >
            {displayedPlayers.map((player, index) => {
              const [left, top] = FALLBACK_AVATAR_POSITIONS[index];

              return (
                <div
                  key={player.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  <FallbackPlayerAvatar player={player} />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FallbackPlayerAvatar({ player }: { player: HeroVerifiedPlayer }) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatar = (
    <span
      className="flex items-center justify-center overflow-hidden rounded-full border border-mulberry/40 bg-[#F9BDAF] font-eastman-bold text-[9px] tracking-[0.06em] text-mulberry shadow-[0_0_0_2px_#54086F,0_0_16px_rgba(84,8,111,0.24)] transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-110"
      style={{ width: 30, height: 30 }}
    >
      {player.avatarUrl && !imageFailed ? (
        <img
          src={player.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        player.initials
      )}
    </span>
  );

  if (!player.profileHandle) {
    return (
      <span
        className="group cursor-ball pointer-events-auto relative block rounded-full"
        role="img"
        aria-label={player.name}
      >
        {avatar}
        <HeroPlayerHoverCard player={player} />
      </span>
    );
  }

  return (
    <Link
      href={buildPublicPlayerPath(player.profileHandle)}
      aria-label={`Ver perfil de @${player.profileHandle}`}
      className="group cursor-ball-action pointer-events-auto relative block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {avatar}
      <HeroPlayerHoverCard player={player} />
    </Link>
  );
}
