'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

type Position = {
  id: string;
  label: string;
  x: number; // 0–100
  y: number; // 0–100
  kind: 'field' | 'bench';
};

type ParticipantMarker = {
  id: string;
  name: string;
  initials?: string;
};

export type SoccerFieldDynamicProps = {
  minUsers: number;
  maxUsers?: number;
  playersPerTeam?: number;
  selectedId?: string | null;
  onSelect?: (pos: Position) => void;
  interactive?: boolean;
  className?: string;
  participants?: ParticipantMarker[];
};

type AnchorContainer = 'portrait' | 'landscape' | 'bench' | null;

export default function SoccerField({
  minUsers,
  maxUsers,
  playersPerTeam,
  selectedId = null,
  onSelect,
  interactive = true,
  className,
  participants = [],
}: SoccerFieldDynamicProps) {
  const registeredCount = participants.length;
  const rosterTarget = Math.max(minUsers, maxUsers ?? minUsers, registeredCount);
  const useSixVsSixLayout = rosterTarget >= 24;
  const nPerTeam = Math.max(
    0,
    Math.floor(playersPerTeam ?? (useSixVsSixLayout ? 6 : Math.floor(minUsers / 2)))
  );
  const fieldSpots = nPerTeam * 2;
  const extras = Math.max(0, rosterTarget - fieldSpots);
  const [placementSeed] = useState(() => Math.floor(Math.random() * 2147483647));

  const fieldPositionsPortrait = useMemo(() => {
    const teamTop = layoutTeam(nPerTeam, 'top');
    const teamBottom = layoutTeam(nPerTeam, 'bottom');
    return [...teamTop, ...teamBottom];
  }, [nPerTeam]);

  const fieldPositionsLandscape = useMemo(
    () => fieldPositionsPortrait.map((p) => ({ ...p, x: p.y, y: 100 - p.x })),
    [fieldPositionsPortrait]
  );

  const benchPositions = useMemo<Position[]>(
    () =>
      Array.from({ length: extras }, (_, i) => ({
        id: `bench-${i + 1}`,
        label: 'Otra jugadora / equipo',
        x: 0,
        y: 0,
        kind: 'bench',
      })),
    [extras]
  );

  const participantBySpotId = useMemo(() => {
    const map = new Map<string, { id: string; name: string; initials: string }>();
    const spots = [...fieldPositionsPortrait, ...benchPositions];
    if (!spots.length || !participants.length) return map;

    const shuffledSpotIds = seededShuffle(
      spots.map((spot) => spot.id),
      placementSeed
    );
    const shuffledParticipants = seededShuffle([...participants], placementSeed ^ 0x9e3779b9);
    const assignments = Math.min(shuffledSpotIds.length, shuffledParticipants.length);

    for (let i = 0; i < assignments; i++) {
      const rawParticipant = shuffledParticipants[i];
      const name = String(rawParticipant?.name || '').trim() || 'Participante';
      map.set(shuffledSpotIds[i], {
        id: String(rawParticipant?.id || `participant-${i + 1}`),
        name,
        initials: toInitials(rawParticipant?.initials || name),
      });
    }

    return map;
  }, [benchPositions, fieldPositionsPortrait, participants, placementSeed]);

  const portraitLayerRef = useRef<HTMLDivElement | null>(null);
  const landscapeLayerRef = useRef<HTMLDivElement | null>(null);
  const benchWrapperRef = useRef<HTMLDivElement | null>(null);

  const [selected, setSelected] = useState<Position | null>(null);

  const [anchor, setAnchor] = useState<{ container: AnchorContainer; x: number; y: number }>({
    container: null,
    x: -9999,
    y: -9999,
  });

  const queryVisibleSpot = (spotId: string): HTMLElement | null => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-spot-id="${spotId}"]`));
    for (const el of nodes) {
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const visible =
        cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      if (visible) return el;
    }
    return null;
  };

  const whichContainerFor = (el: HTMLElement): AnchorContainer => {
    if (portraitLayerRef.current && portraitLayerRef.current.contains(el)) return 'portrait';
    if (landscapeLayerRef.current && landscapeLayerRef.current.contains(el)) return 'landscape';
    if (benchWrapperRef.current && benchWrapperRef.current.contains(el)) return 'bench';
    return null;
  };

  const setAnchorAtElement = (el: HTMLElement) => {
    const container = whichContainerFor(el);
    if (!container) {
      setAnchor({ container: null, x: -9999, y: -9999 });
      return;
    }
    const containerEl =
      container === 'portrait'
        ? portraitLayerRef.current!
        : container === 'landscape'
        ? landscapeLayerRef.current!
        : benchWrapperRef.current!;
    const rEl = el.getBoundingClientRect();
    const rC = containerEl.getBoundingClientRect();
    // relative container coords
    const x = rEl.left - rC.left + rEl.width / 2;
    const y = rEl.top - rC.top + rEl.height / 2;
    setAnchor({ container, x, y });
  };

  const setAnchorBySpotId = (spotId: string) => {
    const el = queryVisibleSpot(spotId);
    if (el) setAnchorAtElement(el);
  };

  const offscreen = () => setAnchor({ container: null, x: -9999, y: -9999 });

  useEffect(() => {
    if (selectedId == null) {
      setSelected(null);
      offscreen();
      return;
    }
    const p =
      [...fieldPositionsPortrait, ...fieldPositionsLandscape, ...benchPositions].find(
        (x) => x.id === selectedId
      ) || null;
    setSelected(p);

    requestAnimationFrame(() => setAnchorBySpotId(selectedId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const reanchor = () => {
      if (!selected) return;
      setAnchorBySpotId(selected.id);
    };
    window.addEventListener('resize', reanchor);
    window.addEventListener('orientationchange', reanchor);
    return () => {
      window.removeEventListener('resize', reanchor);
      window.removeEventListener('orientationchange', reanchor);
    };
  }, [selected]);

  const selectByClick = (p: Position, el: HTMLElement) => {
    if (!interactive) return;
    setSelected(p);
    setAnchorAtElement(el);
    onSelect?.(p);
  };

  const Spot = ({ p, isSelected }: { p: Position; isSelected: boolean }) => {
    const participant = participantBySpotId.get(p.id);
    const label = participant?.name || p.label;

    return (
      <button
        type="button"
        data-spot-id={p.id}
        aria-label={label}
        title={label}
        className={[
          'absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full select-none',
          'flex items-center justify-center focus:outline-none touch-manipulation',
          participant
            ? 'bg-[#5b1c70] border-2 border-[#8d4aa0] text-white shadow-md'
            : 'bg-white/80 backdrop-blur-sm border-2 border-gray-400/60 shadow-sm',
          interactive
            ? 'hover:ring-2 hover:ring-gray-400/40 focus-visible:ring-2 focus-visible:ring-gray-500/60'
            : '',
          isSelected ? 'border-gray-700 ring-2 ring-gray-500/40' : '',
          'w-12 h-12 md:w-12 md:h-12',
          interactive ? 'active:scale-[0.97] transition-transform' : 'cursor-default',
        ].join(' ')}
        style={{ left: `${p.x}%`, top: `${p.y}%` }}
        onClick={(e) => selectByClick(p, e.currentTarget as HTMLElement)}
        disabled={!interactive}
      >
        {participant ? <span className="text-[10px] font-semibold tracking-wide">{participant.initials}</span> : null}
      </button>
    );
  };

  const showSelected = Boolean(selected);

  return (
    <div className="w-full">
      <div
        className={[
          'relative w-full max-w-[960px]',
          'aspect-[58/100] sm:aspect-[62/100] md:aspect-[100/58]',
          'rounded-2xl overflow-hidden bg-gradient-to-b from-[#e8f1ff] to-white border border-purple-200',
          className || '',
        ].join(' ')}
        aria-label={`${nPerTeam} vs ${nPerTeam}`}
      >
        {/* Portrait (mobile) */}
        <div ref={portraitLayerRef} className="absolute inset-0 md:hidden">
          <div className="absolute inset-0 z-0">
            <PitchSVGPortrait />
          </div>
          {fieldPositionsPortrait.map((p) => (
            <Spot key={p.id} p={p} isSelected={selected?.id === p.id} />
          ))}

          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: anchor.container === 'portrait' ? anchor.x : -9999,
              top: anchor.container === 'portrait' ? anchor.y : -9999,
              transform: 'translate(-50%, -50%)',
              width: 64,
              height: 64,
              opacity: showSelected && anchor.container === 'portrait' ? 1 : 0,
            }}
          >
            <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 3], fov: 50 }} frameloop="demand">
              <ambientLight intensity={0.6} />
              <directionalLight position={[2, 3, 5]} intensity={0.9} />
              <SpinningBall color="#5b1c70" />
            </Canvas>
          </div>
        </div>

        {/* Landscape (tablet/desktop) */}
        <div ref={landscapeLayerRef} className="absolute inset-0 hidden md:block">
          <div className="absolute inset-0 z-0">
            <PitchSVGLandscape />
          </div>
          {fieldPositionsLandscape.map((p) => (
            <Spot key={p.id} p={p} isSelected={selected?.id === p.id} />
          ))}

          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: anchor.container === 'landscape' ? anchor.x : -9999,
              top: anchor.container === 'landscape' ? anchor.y : -9999,
              transform: 'translate(-50%, -50%)',
              width: 64,
              height: 64,
              opacity: showSelected && anchor.container === 'landscape' ? 1 : 0,
            }}
          >
            <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 3], fov: 50 }} frameloop="demand">
              <ambientLight intensity={0.6} />
              <directionalLight position={[2, 3, 5]} intensity={0.9} />
              <SpinningBall color="#5b1c70" />
            </Canvas>
          </div>
        </div>

        <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/70 border border-purple-200 text-[#5b1c70] z-10">
          {nPerTeam} vs {nPerTeam}
        </div>
      </div>

      {benchPositions.length > 0 && (
        <div className="w-full max-w-[960px] mx-auto mt-2 px-2">
          <div
            ref={benchWrapperRef}
            className="rounded-xl border border-purple-200 bg-white/80 backdrop-blur-sm p-2"
          >
            <div className="mb-2 w-max mx-auto text-xs px-2 py-1 rounded bg-white/90 border border-purple-200 text-[#5b1c70]">
              Otras jugadoras / equipos: {benchPositions.length}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {benchPositions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-spot-id={p.id}
                  aria-label={participantBySpotId.get(p.id)?.name || p.label}
                  title={participantBySpotId.get(p.id)?.name || p.label}
                  className={[
                    participantBySpotId.get(p.id)
                      ? 'rounded-full border-2 border-[#8d4aa0] bg-[#5b1c70] text-white shadow-md'
                      : 'rounded-full bg-gray-100 border-2 border-gray-400/70 shadow-sm',
                    'focus:outline-none touch-manipulation',
                    interactive
                      ? 'hover:ring-2 hover:ring-gray-400/40 focus-visible:ring-2 focus-visible:ring-gray-500/60'
                      : '',
                    selected?.id === p.id ? 'border-gray-700 ring-2 ring-gray-500/40' : '',
                    interactive
                      ? 'w-12 h-12 active:scale-[0.97] transition-transform flex items-center justify-center'
                      : 'w-12 h-12 cursor-default flex items-center justify-center',
                  ].join(' ')}
                  onClick={(e) => selectByClick(p, e.currentTarget as HTMLElement)}
                  disabled={!interactive}
                >
                  {participantBySpotId.get(p.id) ? (
                    <span className="text-[10px] font-semibold tracking-wide">
                      {participantBySpotId.get(p.id)?.initials}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div
              className="relative z-20 pointer-events-none"
              style={{
                position: 'absolute',
                left: anchor.container === 'bench' ? anchor.x : -9999,
                top: anchor.container === 'bench' ? anchor.y : -9999,
                transform: 'translate(-50%, -50%)',
                width: 64,
                height: 64,
                opacity: showSelected && anchor.container === 'bench' ? 1 : 0,
              }}
            >
              <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 3], fov: 50 }} frameloop="demand">
                <ambientLight intensity={0.6} />
                <directionalLight position={[2, 3, 5]} intensity={0.9} />
                <SpinningBall color="#5b1c70" />
              </Canvas>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function layoutTeam(n: number, side: 'top' | 'bottom'): Position[] {
  const result: Position[] = [];
  if (n <= 0) return result;

  const yGK = side === 'top' ? 10 : 90;
  const rowsYTop = [18, 30, 42];
  const rowsYBot = [82, 70, 58];
  const rowsY = side === 'top' ? rowsYTop : rowsYBot;

  result.push({ id: `${side}-gk`, label: 'Arquera', x: 50, y: yGK, kind: 'field' });
  if (n === 1) return result;

  const remaining = n - 1;
  const rowsCount = Math.min(3, remaining);
  const perRow = splitEvenly(remaining, rowsCount);
  const xRange = { min: 20, max: 80 };

  let acc = 0;
  for (let i = 0; i < rowsCount; i++) {
    const count = perRow[i];
    const y = rowsY[i];
    const xs = spreadXs(count, xRange.min, xRange.max);
    for (let j = 0; j < count; j++) {
      const idx = acc + j + 1;
      result.push({
        id: `${side}-p${idx}`,
        label: side === 'top' ? 'Jugadora A' : 'Jugadora B',
        x: xs[j],
        y,
        kind: 'field',
      });
    }
    acc += count;
  }
  return result;
}

function spreadXs(count: number, min: number, max: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [50];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + i * step);
}

function splitEvenly(n: number, rows: number): number[] {
  const base = Math.floor(n / rows);
  const rem = n % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < rem ? 1 : 0));
}

function toInitials(value: unknown) {
  const text = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!text) return '??';
  const parts = text
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[1][0] || ''}`.slice(0, 2);
  return text.slice(0, 2);
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  if (result.length <= 1) return result;
  const random = mulberry32(seed || 1);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

function mulberry32(initialSeed: number) {
  let t = initialSeed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), t | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function SpinningBall({ color = '#5b1c70' }: { color?: string }) {
  return (
    <mesh rotation={[0.5, 0.3, 0]}>
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.3} />
    </mesh>
  );
}

function PitchSVGPortrait() {
  return (
    <svg viewBox="0 0 650 1000" className="absolute inset-0 w-full h-full">
      <rect x="0" y="0" width="650" height="1000" fill="#f7f4ff" />
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f2ebff" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="610" height="960" rx="24" fill="url(#g1)" />
      <g stroke="#5b1c70" strokeOpacity="0.35" strokeWidth="4" fill="none">
        <rect x="40" y="40" width="570" height="920" rx="18" />
        <line x1="325" y1="40" x2="325" y2="960" />
        <circle cx="325" cy="500" r="90" />
        <rect x="175" y="40" width="300" height="150" />
        <rect x="175" y="810" width="300" height="150" />
        <circle cx="325" cy="500" r="6" fill="#5b1c70" fillOpacity="0.4" />
      </g>
    </svg>
  );
}

function PitchSVGLandscape() {
  return (
    <svg viewBox="0 0 1000 650" className="absolute inset-0 w-full h-full">
      <rect x="0" y="0" width="1000" height="650" fill="#f7f4ff" />
      <defs>
        <linearGradient id="g2" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#f2ebff" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="960" height="610" rx="24" fill="url(#g2)" />
      <g stroke="#5b1c70" strokeOpacity="0.35" strokeWidth="4" fill="none">
        <rect x="40" y="40" width="920" height="570" rx="18" />
        <line x1="500" y1="40" x2="500" y2="610" />
        <circle cx="500" cy="325" r="90" />
        <rect x="40" y="175" width="150" height="300" />
        <rect x="810" y="175" width="150" height="300" />
        <circle cx="500" cy="325" r="6" fill="#5b1c70" fillOpacity="0.4" />
      </g>
    </svg>
  );
}
