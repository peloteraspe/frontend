'use client';

import dynamic from 'next/dynamic';
import type { HeroVerifiedPlayer } from '@modules/home/model/heroVerifiedPlayer';

type HeroSoccerBallClientProps = {
  players: HeroVerifiedPlayer[];
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

const HeroSoccerBall = dynamic(() => import('@modules/home/ui/HeroSoccerBall'), {
  ssr: false,
  loading: () => <HeroSoccerBallFallback />,
});

export default function HeroSoccerBallClient({ players }: HeroSoccerBallClientProps) {
  return <HeroSoccerBall players={players} />;
}

function HeroSoccerBallFallback() {
  return (
    <div className="relative flex min-h-[330px] w-full items-center justify-center sm:min-h-[400px] lg:min-h-[480px]">
      <div className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_center,rgba(39,16,51,0.9),rgba(84,8,111,0.78)_38%,rgba(116,77,124,0.32)_58%,rgba(255,255,255,0)_78%)] blur-2xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-[58%] -translate-y-[54%] rounded-full bg-primary/16 blur-3xl sm:h-[21rem] sm:w-[21rem]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[17rem] w-[17rem] translate-x-[10%] -translate-y-[42%] rounded-full bg-mulberry/16 blur-3xl sm:h-[20rem] sm:w-[20rem]" />

      <div className="relative aspect-square w-full max-w-[23rem] sm:max-w-[27rem] lg:max-w-[30rem]">
        <svg
          viewBox="0 0 480 480"
          className="h-full w-full"
          role="img"
          aria-label="Red 3D de la comunidad Peloteras"
        >
          <defs>
            <radialGradient id="hero-orb" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F0815B" stopOpacity="0.26" />
              <stop offset="50%" stopColor="#54086F" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
            <filter id="hero-blur">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          <circle cx="240" cy="240" r="164" fill="url(#hero-orb)" opacity="0.9" />
          <circle cx="240" cy="240" r="156" fill="none" stroke="#FFF7F2" strokeOpacity="0.18" strokeWidth="1.5" />

          <g filter="url(#hero-blur)" opacity="0.78">
            {FALLBACK_INNER_LINES.map(([x1, y1, x2, y2]) => (
              <line
                key={`inner-glow-${x1}-${y1}-${x2}-${y2}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#F0815B"
                strokeWidth="6"
                strokeLinecap="round"
              />
            ))}
          </g>

          <g opacity="0.6">
            {FALLBACK_OUTER_LINES.map(([x1, y1, x2, y2]) => (
              <line
                key={`outer-${x1}-${y1}-${x2}-${y2}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#F9BDAF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </g>

          <g opacity="0.58">
            {FALLBACK_INNER_LINES.map(([x1, y1, x2, y2]) => (
              <line
                key={`inner-${x1}-${y1}-${x2}-${y2}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#744D7C"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ))}
          </g>

          <g>
            {FALLBACK_NODES.map(([cx, cy], index) => (
              <g key={`node-${cx}-${cy}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={index % 5 === 0 ? 8 : 6}
                  fill={index % 4 === 0 ? '#F0815B' : '#F9BDAF'}
                  opacity="0.22"
                  filter="url(#hero-blur)"
                />
                <circle cx={cx} cy={cy} r={index % 6 === 0 ? 3.5 : 2.8} fill="#FFF7F2" />
              </g>
            ))}
          </g>
        </svg>
      </div>
      <div className="absolute bottom-6 left-1/2 w-full max-w-[18rem] -translate-x-1/2 px-5 text-center text-[11px] leading-5 text-white/62">
        Cargando red 3D de la comunidad Peloteras.
      </div>
    </div>
  );
}
