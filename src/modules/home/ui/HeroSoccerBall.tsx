'use client';

import { Html } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { HeroVerifiedPlayer } from '@modules/home/model/heroVerifiedPlayer';

type HeroSoccerBallProps = {
  players: HeroVerifiedPlayer[];
};

type NodeKind = 'outer' | 'inner';

type NodeSpec = {
  id: string;
  kind: NodeKind;
  position: [number, number, number];
  size: number;
};

const NETWORK_SCALE = 0.8;
const OUTER_RADIUS = 3.34;
const OUTER_NODE_COUNT = 72;
const INNER_NODE_COUNT = 28;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const RIM_COLOR = '#F9BDAF';
const CORE_COLOR = '#FFF7F2';
const PRIMARY_COLOR = '#F0815B';
const MULBERRY_COLOR = '#54086F';
const PLUM_COLOR = '#744D7C';
const AVATAR_OFFSET = 0.1;

function toTuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

function mulberry32(initialSeed: number) {
  let value = initialSeed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = Math.imul(value ^ (value >>> 15), value | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number) {
  const result = [...items];
  if (result.length <= 1) return result;

  const random = mulberry32(seed || 1);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }

  return result;
}

function hashPlayers(players: HeroVerifiedPlayer[]) {
  let hash = 0x811c9dc5;
  const source = players.map((player) => `${player.id}:${player.name}`).join('|') || 'peloteras';

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function hasDisplayAvatar(player: HeroVerifiedPlayer) {
  return typeof player.avatarUrl === 'string' && player.avatarUrl.trim().length > 0;
}

function nodeShowcaseScore(node: NodeSpec) {
  const [x, y, z] = node.position;
  const radius = Math.max(Math.sqrt(x * x + y * y + z * z), 1);
  const frontness = (z / radius + 1) / 2;
  const verticalFocus = 1 - Math.min(Math.abs(y) / radius, 1);
  const horizontalFocus = 1 - Math.min(Math.abs(x) / radius, 1);
  const outerBonus = node.kind === 'outer' ? 1.15 : 0;
  const sizeBonus = node.size * 3.4;

  return outerBonus + frontness * 2.5 + verticalFocus * 0.7 + horizontalFocus * 0.35 + sizeBonus;
}

function orderNodesForShowcase(nodes: NodeSpec[], seed: number) {
  return seededShuffle(nodes, seed ^ 0xa511e9b3).sort(
    (left, right) => nodeShowcaseScore(right) - nodeShowcaseScore(left)
  );
}

function orderPlayersForShowcase(players: HeroVerifiedPlayer[], seed: number) {
  const playersWithAvatar = seededShuffle(
    players.filter((player) => hasDisplayAvatar(player)),
    seed ^ 0xc2b2ae35
  );
  const playersWithoutAvatar = seededShuffle(
    players.filter((player) => !hasDisplayAvatar(player)),
    seed ^ 0x27d4eb2f
  );

  return [...playersWithAvatar, ...playersWithoutAvatar];
}

function createOuterNodes() {
  return Array.from({ length: OUTER_NODE_COUNT }, (_, index) => {
    const progress = index / OUTER_NODE_COUNT;
    const y = 1 - progress * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * index;
    const wave = 1 + Math.sin(index * 0.55) * 0.028;
    const position = new THREE.Vector3(
      Math.cos(theta) * radius,
      y,
      Math.sin(theta) * radius
    ).multiplyScalar(OUTER_RADIUS * wave);

    return {
      id: `outer-${index}`,
      kind: 'outer' as const,
      position: toTuple(position),
      size: index % 6 === 0 ? 0.06 : 0.048,
    };
  });
}

function createInnerNodes() {
  const random = mulberry32(0x2f8a1c4d);

  return Array.from({ length: INNER_NODE_COUNT }, (_, index) => {
    const progress = index / INNER_NODE_COUNT;
    const y = 1 - progress * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * index * 1.18 + Math.sin(index * 0.61) * 0.75;
    const base = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
    const depth = THREE.MathUtils.lerp(1.55, 2.45, 0.35 + random() * 0.65);
    const wobble = new THREE.Vector3(
      Math.sin(index * 0.92) * 0.3,
      Math.cos(index * 1.31) * 0.22,
      Math.sin(index * 0.58 + 1.4) * 0.28
    );
    const position = base.multiplyScalar(depth).add(wobble);

    return {
      id: `inner-${index}`,
      kind: 'inner' as const,
      position: toTuple(position),
      size: index % 5 === 0 ? 0.05 : 0.038,
    };
  });
}

function distanceBetween(a: NodeSpec, b: NodeSpec) {
  return new THREE.Vector3(...a.position).distanceTo(new THREE.Vector3(...b.position));
}

function buildSegments(
  nodes: NodeSpec[],
  neighborCount: number,
  maxDistance: number,
  minDistance = 0
) {
  const positions: number[] = [];
  const seen = new Set<string>();

  nodes.forEach((node, index) => {
    const neighbors = nodes
      .map((candidate, candidateIndex) => ({
        candidate,
        candidateIndex,
        distance: candidateIndex === index ? Number.POSITIVE_INFINITY : distanceBetween(node, candidate),
      }))
      .filter(({ distance }) => distance >= minDistance && distance <= maxDistance)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, neighborCount);

    neighbors.forEach(({ candidate, candidateIndex }) => {
      const key = index < candidateIndex ? `${index}:${candidateIndex}` : `${candidateIndex}:${index}`;
      if (seen.has(key)) return;
      seen.add(key);

      positions.push(...node.position, ...candidate.position);
    });
  });

  return new Float32Array(positions);
}

function buildBridgeSegments(innerNodes: NodeSpec[], outerNodes: NodeSpec[]) {
  const positions: number[] = [];

  innerNodes.forEach((innerNode, index) => {
    if (index % 2 !== 0) return;

    const nearestOuterNode = outerNodes
      .map((outerNode) => ({
        outerNode,
        distance: distanceBetween(innerNode, outerNode),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 2);

    nearestOuterNode.forEach(({ outerNode, distance }, bridgeIndex) => {
      if (distance > 2.2 && bridgeIndex > 0) return;
      positions.push(...innerNode.position, ...outerNode.position);
    });
  });

  return new Float32Array(positions);
}

const NETWORK_DATA = (() => {
  const outerNodes = createOuterNodes();
  const innerNodes = createInnerNodes();

  return {
    outerNodes,
    innerNodes,
    outerSegments: buildSegments(outerNodes, 4, 1.62, 0.44),
    innerSegments: buildSegments(innerNodes, 4, 1.95, 0.4),
    bridgeSegments: buildBridgeSegments(innerNodes, outerNodes),
  };
})();

function NetworkLines({
  positions,
  color,
  opacity,
  scale = 1,
}: {
  positions: Float32Array;
  color: string;
  opacity: number;
  scale?: number;
}) {
  return (
    <lineSegments scale={scale} renderOrder={1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
}

function NetworkNodes({
  nodes,
  activeNodeIds,
  assignedPlayerByNodeId,
}: {
  nodes: NodeSpec[];
  activeNodeIds: Set<string>;
  assignedPlayerByNodeId: Map<string, HeroVerifiedPlayer>;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isOuter = node.kind === 'outer';
        const isActive = activeNodeIds.has(node.id);
        const player = assignedPlayerByNodeId.get(node.id) ?? null;
        const coreColor = isOuter ? CORE_COLOR : isActive ? PRIMARY_COLOR : RIM_COLOR;
        const haloColor = isOuter ? (isActive ? PRIMARY_COLOR : RIM_COLOR) : isActive ? PRIMARY_COLOR : PLUM_COLOR;
        const haloOpacity = player ? (isActive ? 0.48 : 0.34) : isActive ? 0.42 : isOuter ? 0.24 : 0.16;
        const haloScale = player ? (isActive ? 2.7 : 2.2) : isActive ? 2.4 : isOuter ? 1.8 : 1.55;
        const emissiveIntensity = isActive ? 1.4 : isOuter ? 0.78 : 0.52;
        const avatarOffset = new THREE.Vector3(...node.position)
          .normalize()
          .multiplyScalar(AVATAR_OFFSET);

        return (
          <group key={node.id} position={node.position}>

            {!player ? (
              <mesh>
                <sphereGeometry args={isActive ? [node.size * 1.12, 12, 12] : [node.size, 10, 10]} />
                <meshStandardMaterial
                  color={coreColor}
                  emissive={haloColor}
                  emissiveIntensity={emissiveIntensity}
                  roughness={0.28}
                  metalness={0.04}
                />
              </mesh>
            ) : null}

            {player ? (
              <Html
                position={avatarOffset.toArray()}
                center
                transform
                sprite
                distanceFactor={7.8}
                style={{ pointerEvents: 'none' }}
              >
                <AvatarBadge node={node} player={player} highlighted={isActive} />
              </Html>
            ) : null}
          </group>
        );
      })}
    </>
  );
}

function AvatarBadge({
  node,
  player,
  highlighted,
}: {
  node: NodeSpec;
  player: HeroVerifiedPlayer;
  highlighted: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const isOuter = node.kind === 'outer';
  const size = isOuter ? 22 : 19;
  const ringColor = MULBERRY_COLOR;
  const glowColor = highlighted ? 'rgba(84,8,111,0.34)' : 'rgba(84,8,111,0.28)';

  return (
    <div
      className="pointer-events-none flex items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        border: '1px solid rgba(84,8,111,0.42)',
        background:
          player.avatarUrl && !imageFailed
            ? 'rgba(255,255,255,0.94)'
            : 'radial-gradient(circle at 30% 30%, rgba(255,247,242,0.98), rgba(249,189,175,0.92) 52%, rgba(116,77,124,0.88) 100%)',
        boxShadow: `0 0 0 1.5px ${ringColor}, 0 0 18px ${glowColor}`,
        backdropFilter: 'blur(8px)',
      }}
      title={player.name}
    >
      {player.avatarUrl && !imageFailed ? (
        <img
          src={player.avatarUrl}
          alt={player.name}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className="font-eastman-bold text-[8px] tracking-[0.08em]"
          style={{ color: highlighted ? '#FFF7F2' : isOuter ? MULBERRY_COLOR : '#FFF7F2' }}
        >
          {player.initials}
        </span>
      )}
    </div>
  );
}

function SoccerBallNetwork({ players }: HeroSoccerBallProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const seed = useMemo(() => hashPlayers(players), [players]);
  const assignedPlayerByNodeId = useMemo(() => {
    const assignments = new Map<string, HeroVerifiedPlayer>();
    if (!players.length) return assignments;

    const orderedNodes = orderNodesForShowcase(
      [...NETWORK_DATA.outerNodes, ...NETWORK_DATA.innerNodes],
      seed
    );
    const orderedPlayers = orderPlayersForShowcase(players, seed);
    const limit = Math.min(orderedPlayers.length, orderedNodes.length);

    for (let index = 0; index < limit; index += 1) {
      assignments.set(orderedNodes[index].id, orderedPlayers[index]);
    }

    return assignments;
  }, [players, seed]);
  const activeNodeIds = useMemo(() => {
    if (assignedPlayerByNodeId.size > 0) {
      return new Set(Array.from(assignedPlayerByNodeId.keys()));
    }

    const allNodes = [...NETWORK_DATA.outerNodes, ...NETWORK_DATA.innerNodes];
    return new Set(
      seededShuffle(allNodes, seed)
        .slice(0, 12)
        .map((node) => node.id)
    );
  }, [assignedPlayerByNodeId, seed]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const elapsed = state.clock.getElapsedTime();
    group.rotation.y += delta * 0.12;
    group.rotation.x = THREE.MathUtils.lerp(
      group.rotation.x,
      -0.18 + Math.sin(elapsed * 0.38) * 0.05,
      0.04
    );
    group.rotation.z = THREE.MathUtils.lerp(
      group.rotation.z,
      Math.sin(elapsed * 0.26) * 0.04,
      0.04
    );
  });

  return (
    <group ref={groupRef} scale={NETWORK_SCALE}>
      <mesh>
        <sphereGeometry args={[3.04, 56, 56]} />
        <meshPhysicalMaterial
          color="#FFF4EE"
          transparent
          opacity={0.07}
          roughness={0.18}
          metalness={0.04}
          clearcoat={1}
          clearcoatRoughness={0.38}
        />
      </mesh>

      <mesh scale={1.1}>
        <sphereGeometry args={[3.04, 44, 44]} />
        <meshBasicMaterial
          color={PRIMARY_COLOR}
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={1.16}>
        <sphereGeometry args={[3.04, 40, 40]} />
        <meshBasicMaterial
          color={PLUM_COLOR}
          transparent
          opacity={0.045}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.3, 24, 24]} />
        <meshBasicMaterial
          color={PRIMARY_COLOR}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <NetworkLines positions={NETWORK_DATA.outerSegments} color={RIM_COLOR} opacity={0.38} />
      <NetworkLines positions={NETWORK_DATA.outerSegments} color={CORE_COLOR} opacity={0.12} scale={1.008} />
      <NetworkLines positions={NETWORK_DATA.innerSegments} color={PRIMARY_COLOR} opacity={0.22} />
      <NetworkLines positions={NETWORK_DATA.innerSegments} color={PLUM_COLOR} opacity={0.12} scale={1.012} />
      <NetworkLines positions={NETWORK_DATA.bridgeSegments} color={MULBERRY_COLOR} opacity={0.18} />

      <NetworkNodes
        nodes={NETWORK_DATA.outerNodes}
        activeNodeIds={activeNodeIds}
        assignedPlayerByNodeId={assignedPlayerByNodeId}
      />
      <NetworkNodes
        nodes={NETWORK_DATA.innerNodes}
        activeNodeIds={activeNodeIds}
        assignedPlayerByNodeId={assignedPlayerByNodeId}
      />
    </group>
  );
}

export default function HeroSoccerBall({ players }: HeroSoccerBallProps) {
  return (
    <div className="relative flex min-h-[330px] w-full items-center justify-center sm:min-h-[400px] lg:min-h-[480px]">
      <div className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_center,rgba(39,16,51,0.9),rgba(84,8,111,0.78)_38%,rgba(116,77,124,0.32)_58%,rgba(255,255,255,0)_78%)] blur-2xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-[58%] -translate-y-[54%] rounded-full bg-primary/16 blur-3xl sm:h-[21rem] sm:w-[21rem]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[17rem] w-[17rem] translate-x-[10%] -translate-y-[42%] rounded-full bg-mulberry/16 blur-3xl sm:h-[20rem] sm:w-[20rem]" />

      <div className="relative z-[1] aspect-square w-full max-w-[23rem] sm:max-w-[27rem] lg:max-w-[30rem]">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 10.9], fov: 32 }}
          gl={{ alpha: true, antialias: true }}
          className="h-full w-full"
        >
          <ambientLight intensity={0.86} />
          <pointLight position={[6.5, 6, 8]} intensity={55} color="#fff7f3" />
          <pointLight position={[-6, -4, -7]} intensity={34} color="#dcb3ea" />
          <pointLight position={[0, 0, 6]} intensity={26} color="#f59e7b" />
          <directionalLight position={[0, 5, 4]} intensity={1.45} color="#ffffff" />
          <SoccerBallNetwork players={players} />
        </Canvas>
      </div>
    </div>
  );
}
