'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Link from 'next/link';

type Position = {
  id: string;
  label: string;
  x: number; // 0–100
  y: number; // 0–100
  kind: 'field' | 'bench';
  role?: FieldRole;
  side?: 'top' | 'bottom';
};

type FieldRole = 'goalkeeper' | 'defense' | 'midfield' | 'forward';
type FieldSide = 'top' | 'bottom';

type ParticipantMarker = {
  id: string;
  name: string;
  initials?: string;
  avatarUrl?: string;
  profileHref?: string;
  positions?: string[];
  teamId?: string;
  teamName?: string;
};

type AssignedParticipant = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string;
  profileHref: string;
  positions: string[];
  roles: FieldRole[];
  teamId: string;
  teamName: string;
  assignedSide: FieldSide | null;
  isAdapted: boolean;
};

type PreparedParticipant = AssignedParticipant & {
  sourceIndex: number;
};

function ParticipantFace({ participant }: { participant: AssignedParticipant }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (participant.avatarUrl && !imageFailed) {
    return (
      <img
        src={participant.avatarUrl}
        alt={`Foto de ${participant.name}`}
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span className="text-[10px] font-semibold tracking-wide">{participant.initials}</span>
  );
}

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
  const fieldPositionsPortrait = useMemo(() => {
    const teamTop = layoutTeam(nPerTeam, 'top');
    const teamBottom = layoutTeam(nPerTeam, 'bottom');
    return [...teamTop, ...teamBottom];
  }, [nPerTeam]);

  const fieldPositionsLandscape = useMemo(
    () => fieldPositionsPortrait.map((p) => ({ ...p, x: p.y, y: 100 - p.x })),
    [fieldPositionsPortrait]
  );

  const { participantBySpotId, benchPositions } = useMemo(() => {
    const map = new Map<string, AssignedParticipant>();
    const createBenchPositions = (count: number): Position[] =>
      Array.from({ length: count }, (_, index) => ({
        id: `bench-${index + 1}`,
        label: 'Suplente / rotación',
        x: 0,
        y: 0,
        kind: 'bench',
      }));

    if (!participants.length) {
      return { participantBySpotId: map, benchPositions: createBenchPositions(extras) };
    }

    const availableParticipants: PreparedParticipant[] = participants.map(
      (rawParticipant, index) => {
        const name = String(rawParticipant?.name || '').trim() || 'Participante';
        const positions = Array.isArray(rawParticipant?.positions)
          ? rawParticipant.positions
              .map((position) => String(position || '').trim())
              .filter(Boolean)
          : [];
        return {
          id: String(rawParticipant?.id || `participant-${index + 1}`),
          name,
          initials: toInitials(rawParticipant?.initials || name),
          avatarUrl: String(rawParticipant?.avatarUrl || '').trim(),
          profileHref: String(rawParticipant?.profileHref || '').trim(),
          positions,
          roles: getParticipantRoles(positions),
          teamId: String(rawParticipant?.teamId || '').trim(),
          teamName: String(rawParticipant?.teamName || '').trim(),
          assignedSide: null,
          isAdapted: false,
          sourceIndex: index,
        };
      }
    );
    const assignedParticipantIds = new Set<string>();
    const assignedSpotIds = new Set<string>();
    const assignedTeamCount = { top: 0, bottom: 0 };
    const benchAssignments: PreparedParticipant[] = [];
    const rolePriority: FieldRole[] = ['goalkeeper', 'forward', 'defense', 'midfield'];
    const spotOrder = new Map(fieldPositionsPortrait.map((spot, index) => [spot.id, index]));
    const sideOrder: FieldSide[] = ['top', 'bottom'];

    const assignToSpot = (
      spot: Position,
      participant: PreparedParticipant,
      isAdapted: boolean
    ) => {
      map.set(spot.id, {
        ...participant,
        assignedSide: spot.side ?? participant.assignedSide,
        isAdapted,
      });
      assignedParticipantIds.add(participant.id);
      assignedSpotIds.add(spot.id);
      if (spot.side) assignedTeamCount[spot.side] += 1;
    };

    const queueForBench = (participant: PreparedParticipant, assignedSide: FieldSide | null) => {
      benchAssignments.push({ ...participant, assignedSide });
      assignedParticipantIds.add(participant.id);
    };

    const compareAvailableSpots = (a: Position, b: Position) => {
      const sideDifference =
        assignedTeamCount[a.side ?? 'top'] - assignedTeamCount[b.side ?? 'top'];
      return sideDifference || (spotOrder.get(a.id) ?? 0) - (spotOrder.get(b.id) ?? 0);
    };

    const assignGroupToSide = (group: PreparedParticipant[], side: FieldSide) => {
      rolePriority.forEach((role) => {
        let availableSpots = fieldPositionsPortrait.filter(
          (spot) => spot.side === side && spot.role === role && !assignedSpotIds.has(spot.id)
        );
        let candidate = group
          .filter(
            (participant) =>
              !assignedParticipantIds.has(participant.id) && participant.roles.includes(role)
          )
          .sort(comparePositionCandidates)[0];

        while (candidate && availableSpots.length > 0) {
          const spot = [...availableSpots].sort(
            (a, b) => (spotOrder.get(a.id) ?? 0) - (spotOrder.get(b.id) ?? 0)
          )[0];
          assignToSpot(spot, candidate, false);
          availableSpots = availableSpots.filter(
            (availableSpot) => availableSpot.id !== spot.id
          );
          candidate = group
            .filter(
              (participant) =>
                !assignedParticipantIds.has(participant.id) && participant.roles.includes(role)
            )
            .sort(comparePositionCandidates)[0];
        }
      });

      group
        .filter((participant) => !assignedParticipantIds.has(participant.id))
        .sort(comparePositionCandidates)
        .forEach((participant) => {
          const spot = fieldPositionsPortrait
            .filter(
              (fieldSpot) =>
                fieldSpot.side === side && !assignedSpotIds.has(fieldSpot.id)
            )
            .sort((a, b) => {
              const penaltyDifference =
                getAdaptationPenalty(participant.roles, a.role) -
                getAdaptationPenalty(participant.roles, b.role);
              return (
                penaltyDifference ||
                (spotOrder.get(a.id) ?? 0) - (spotOrder.get(b.id) ?? 0)
              );
            })[0];
          if (spot) assignToSpot(spot, participant, true);
        });

      group
        .filter((participant) => !assignedParticipantIds.has(participant.id))
        .sort(comparePositionCandidates)
        .forEach((participant) => queueForBench(participant, side));
    };

    const teamGroupsById = new Map<string, PreparedParticipant[]>();
    availableParticipants.forEach((participant) => {
      if (!participant.teamId) return;
      const current = teamGroupsById.get(participant.teamId) ?? [];
      current.push(participant);
      teamGroupsById.set(participant.teamId, current);
    });

    const teamGroups = Array.from(teamGroupsById.values()).sort((a, b) => {
      if (a.length !== b.length) return b.length - a.length;
      return (
        (a[0]?.sourceIndex ?? 0) - (b[0]?.sourceIndex ?? 0) ||
        String(a[0]?.teamId || '').localeCompare(String(b[0]?.teamId || ''))
      );
    });

    teamGroups.forEach((group) => {
      const remainingSlots = (side: FieldSide) =>
        fieldPositionsPortrait.filter(
          (spot) => spot.side === side && !assignedSpotIds.has(spot.id)
        ).length;
      const fittingSides = sideOrder.filter((side) => remainingSlots(side) >= group.length);
      const candidateSides = fittingSides.length > 0 ? fittingSides : sideOrder;
      const assignedSide = [...candidateSides].sort((a, b) => {
        if (fittingSides.length === 0) {
          const remainingDifference = remainingSlots(b) - remainingSlots(a);
          if (remainingDifference) return remainingDifference;
        }
        return (
          assignedTeamCount[a] - assignedTeamCount[b] ||
          sideOrder.indexOf(a) - sideOrder.indexOf(b)
        );
      })[0];
      assignGroupToSide(group, assignedSide);
    });

    const individualParticipants = availableParticipants.filter(
      (participant) => !participant.teamId
    );

    rolePriority.forEach((role) => {
      let availableSpots = fieldPositionsPortrait.filter(
        (spot) => spot.role === role && !assignedSpotIds.has(spot.id)
      );
      let candidate = individualParticipants
        .filter(
          (participant) =>
            !assignedParticipantIds.has(participant.id) && participant.roles.includes(role)
        )
        .sort(comparePositionCandidates)[0];

      while (candidate && availableSpots.length > 0) {
        const spot = [...availableSpots].sort(compareAvailableSpots)[0];
        assignToSpot(spot, candidate, false);
        availableSpots = availableSpots.filter((availableSpot) => availableSpot.id !== spot.id);
        candidate = individualParticipants
          .filter(
            (participant) =>
              !assignedParticipantIds.has(participant.id) && participant.roles.includes(role)
          )
          .sort(comparePositionCandidates)[0];
      }
    });

    individualParticipants
      .filter((participant) => !assignedParticipantIds.has(participant.id))
      .sort(comparePositionCandidates)
      .forEach((participant) => {
        const spot = fieldPositionsPortrait
          .filter((fieldSpot) => !assignedSpotIds.has(fieldSpot.id))
          .sort((a, b) => {
            const penaltyDifference =
              getAdaptationPenalty(participant.roles, a.role) -
              getAdaptationPenalty(participant.roles, b.role);
            return penaltyDifference || compareAvailableSpots(a, b);
          })[0];
        if (spot) assignToSpot(spot, participant, true);
      });

    individualParticipants
      .filter((participant) => !assignedParticipantIds.has(participant.id))
      .sort(comparePositionCandidates)
      .forEach((participant) => queueForBench(participant, null));

    const effectiveBenchCount = Math.max(extras, benchAssignments.length);
    const benchPositions = createBenchPositions(effectiveBenchCount);
    benchPositions.forEach((spot, index) => {
      const participant = benchAssignments[index];
      if (participant) map.set(spot.id, participant);
    });

    return { participantBySpotId: map, benchPositions };
  }, [extras, fieldPositionsPortrait, participants]);

  const sideSummaries = useMemo(
    () =>
      (['top', 'bottom'] as FieldSide[]).map((side, index) => {
        const fieldParticipantIds = new Set(
          fieldPositionsPortrait
            .filter((spot) => spot.side === side)
            .map((spot) => participantBySpotId.get(spot.id)?.id)
            .filter((id): id is string => Boolean(id))
        );
        const assignedParticipants = Array.from(participantBySpotId.values()).filter(
          (participant) => participant.assignedSide === side
        );
        const teamNames = Array.from(
          new Set(
            assignedParticipants
              .map((participant) => participant.teamName)
              .filter((teamName) => teamName.length > 0)
          )
        );
        const fieldCount = fieldParticipantIds.size;
        const rotationCount = assignedParticipants.filter(
          (participant) => !fieldParticipantIds.has(participant.id)
        ).length;

        return {
          side,
          label: `Equipo ${index === 0 ? 'A' : 'B'}`,
          detail:
            teamNames.length > 0
              ? teamNames.join(' + ')
              : fieldCount > 0
                ? 'Jugadoras individuales'
                : 'Por completar',
          fieldCount,
          rotationCount,
        };
      }),
    [fieldPositionsPortrait, participantBySpotId]
  );

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
    const markerTitle = `${label} · ${p.label}${participant?.isAdapted ? ' (ubicación adaptada)' : ''}`;
    const canActivate = interactive || Boolean(participant?.profileHref);
    const className = [
      'relative rounded-full select-none overflow-hidden',
      'flex items-center justify-center focus:outline-none touch-manipulation',
      participant
        ? participant.isAdapted
          ? 'bg-[#5b1c70] border-2 border-amber-400 text-white shadow-md'
          : 'bg-[#5b1c70] border-2 border-[#8d4aa0] text-white shadow-md'
        : 'bg-white/80 backdrop-blur-sm border-2 border-gray-400/60 shadow-sm',
      canActivate
        ? 'hover:ring-2 hover:ring-gray-400/40 focus-visible:ring-2 focus-visible:ring-gray-500/60'
        : '',
      isSelected ? 'border-gray-700 ring-2 ring-gray-500/40' : '',
      'w-12 h-12 md:w-12 md:h-12',
      canActivate ? 'active:scale-[0.97] transition-transform' : 'cursor-default',
    ].join(' ');
    const content = participant ? <ParticipantFace participant={participant} /> : null;
    const positionTag = (
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%-0.15rem)] z-20 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-900 px-2 py-0.5 text-[9px] font-bold leading-none tracking-wide text-white shadow-sm">
        {getShortRoleLabel(p.role)}
      </span>
    );

    if (participant?.profileHref) {
      return (
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <Link
            href={participant.profileHref}
            data-spot-id={p.id}
            aria-label={`Ver perfil de ${label}. ${p.label}${participant.isAdapted ? ', ubicación adaptada' : ''}`}
            title={markerTitle}
            className={className}
          >
            {content}
          </Link>
          {positionTag}
        </div>
      );
    }

    return (
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${p.x}%`, top: `${p.y}%` }}
      >
        <button
          type="button"
          data-spot-id={p.id}
          aria-label={markerTitle}
          title={markerTitle}
          className={className}
          onClick={(e) => selectByClick(p, e.currentTarget as HTMLElement)}
          disabled={!interactive}
        >
          {content}
        </button>
        {positionTag}
      </div>
    );
  };

  const showSelected = Boolean(selected);

  return (
    <div className="w-full">
      <div className="mb-2 grid w-full max-w-[960px] grid-cols-2 gap-2">
        {sideSummaries.map((summary) => (
          <div
            key={summary.side}
            className="min-w-0 rounded-xl border border-purple-200 bg-purple-50/60 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 whitespace-nowrap text-xs font-bold uppercase tracking-wide text-[#5b1c70]">
                {summary.label}
              </span>
              <span className="shrink-0 text-[10px] font-medium text-slate-500">
                {summary.fieldCount} en cancha
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-700" title={summary.detail}>
              {summary.detail}
            </p>
            {summary.rotationCount > 0 ? (
              <p className="mt-0.5 text-[10px] text-slate-500">
                {summary.rotationCount} en rotación
              </p>
            ) : null}
          </div>
        ))}
      </div>

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
            className="relative rounded-xl border border-purple-200 bg-white/80 p-2 backdrop-blur-sm"
          >
            <div className="mb-2 w-max mx-auto text-xs px-2 py-1 rounded bg-white/90 border border-purple-200 text-[#5b1c70]">
              Cupos de rotación / suplentes: {benchPositions.length}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {benchPositions.map((p) => {
                const participant = participantBySpotId.get(p.id);
                const label = participant?.name || p.label;
                const teamLabel =
                  participant?.teamName && participant.assignedSide
                    ? `${getSideLabel(participant.assignedSide)} · ${participant.teamName}`
                    : '';
                const canActivate = interactive || Boolean(participant?.profileHref);
                const className = [
                  participant
                    ? 'rounded-full border-2 border-[#8d4aa0] bg-[#5b1c70] text-white shadow-md overflow-hidden'
                    : 'rounded-full bg-gray-100 border-2 border-gray-400/70 shadow-sm',
                  'focus:outline-none touch-manipulation w-12 h-12 flex items-center justify-center',
                  canActivate
                    ? 'hover:ring-2 hover:ring-gray-400/40 focus-visible:ring-2 focus-visible:ring-gray-500/60 active:scale-[0.97] transition-transform'
                    : 'cursor-default',
                  selected?.id === p.id ? 'border-gray-700 ring-2 ring-gray-500/40' : '',
                ].join(' ');
                const content = participant ? <ParticipantFace participant={participant} /> : null;
                const control = participant?.profileHref ? (
                  <Link
                    href={participant.profileHref}
                    data-spot-id={p.id}
                    aria-label={`Ver perfil de ${label}${teamLabel ? `. ${teamLabel}` : ''}`}
                    title={`${label}${teamLabel ? ` · ${teamLabel}` : ''}`}
                    className={className}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    data-spot-id={p.id}
                    aria-label={`${label}${teamLabel ? `. ${teamLabel}` : ''}`}
                    title={`${label}${teamLabel ? ` · ${teamLabel}` : ''}`}
                    className={className}
                    onClick={(e) => selectByClick(p, e.currentTarget as HTMLElement)}
                    disabled={!interactive}
                  >
                    {content}
                  </button>
                );

                return (
                  <div key={p.id} className="flex max-w-28 flex-col items-center gap-1">
                    {control}
                    {teamLabel ? (
                      <span
                        className="max-w-28 truncate text-center text-[10px] font-semibold text-[#5b1c70]"
                        title={teamLabel}
                      >
                        {teamLabel}
                      </span>
                    ) : null}
                  </div>
                );
              })}
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

  const yGK = side === 'top' ? 8 : 92;
  const rowsYTop = [22, 34, 44];
  const rowsYBot = [78, 66, 56];
  const rowsY = side === 'top' ? rowsYTop : rowsYBot;

  result.push({
    id: `${side}-gk`,
    label: 'Arquera',
    x: 50,
    y: yGK,
    kind: 'field',
    role: 'goalkeeper',
    side,
  });
  if (n === 1) return result;

  const remaining = n - 1;
  const rowsCount = Math.min(3, remaining);
  const perRow = splitEvenly(remaining, rowsCount);
  const rowRoles = getRowRoles(rowsCount);
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
        label: getRoleLabel(rowRoles[i]),
        x: xs[j],
        y,
        kind: 'field',
        role: rowRoles[i],
        side,
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

function normalizePositionName(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getParticipantRoles(positions: string[]): FieldRole[] {
  const roles = new Set<FieldRole>();
  positions.forEach((position) => {
    const normalized = normalizePositionName(position);
    if (/port|arquer|keeper/.test(normalized)) roles.add('goalkeeper');
    if (/defen|lateral|central|back/.test(normalized)) roles.add('defense');
    if (/medio|mid|volant|pivot|pivote|enganche|contencion|interior/.test(normalized)) {
      roles.add('midfield');
    }
    if (/delant|atac|wing|extrem|punta|striker|forward/.test(normalized)) roles.add('forward');
  });
  return Array.from(roles);
}

function comparePositionCandidates(a: PreparedParticipant, b: PreparedParticipant) {
  if (a.roles.length !== b.roles.length) return a.roles.length - b.roles.length;
  return a.sourceIndex - b.sourceIndex || a.id.localeCompare(b.id);
}

function getAdaptationPenalty(roles: FieldRole[], targetRole?: FieldRole) {
  if (!targetRole || roles.length === 0) return 2;
  if (roles.includes(targetRole)) return 0;
  if (targetRole === 'goalkeeper' || roles.includes('goalkeeper')) return 4;
  const fieldOrder: FieldRole[] = ['defense', 'midfield', 'forward'];
  const targetIndex = fieldOrder.indexOf(targetRole);
  return Math.min(...roles.map((role) => Math.abs(fieldOrder.indexOf(role) - targetIndex) + 1));
}

function getRowRoles(rowsCount: number): FieldRole[] {
  if (rowsCount <= 1) return ['forward'];
  if (rowsCount === 2) return ['defense', 'forward'];
  return ['defense', 'midfield', 'forward'];
}

function getRoleLabel(role?: FieldRole) {
  switch (role) {
    case 'goalkeeper':
      return 'Arquera';
    case 'defense':
      return 'Defensa';
    case 'midfield':
      return 'Mediocampo';
    case 'forward':
      return 'Delantera';
    default:
      return 'Posición';
  }
}

function getShortRoleLabel(role?: FieldRole) {
  switch (role) {
    case 'goalkeeper':
      return 'ARQ';
    case 'defense':
      return 'DEF';
    case 'midfield':
      return 'MED';
    case 'forward':
      return 'DEL';
    default:
      return 'POS';
  }
}

function getSideLabel(side: FieldSide) {
  return side === 'top' ? 'Equipo A' : 'Equipo B';
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
