'use client';

import { Html } from '@react-three/drei';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import type { HeroVerifiedPlayer } from '@modules/home/model/heroVerifiedPlayer';
import HeroPlayerHoverCard from '@modules/home/ui/HeroPlayerHoverCard';
import { buildPublicPlayerPath } from '@shared/lib/publicProfilePaths';

type HeroSoccerBallProps = {
  players: HeroVerifiedPlayer[];
  onReady?: () => void;
};

type NodeKind = 'outer' | 'inner';

type NodeSpec = {
  id: string;
  kind: NodeKind;
  position: [number, number, number];
  size: number;
};

const NETWORK_SCALE = 0.72;
const OUTER_RADIUS = 3.34;
const OUTER_NODE_COUNT = 52;
const INNER_NODE_COUNT = 18;
const DISPLAY_NODE_COUNT = 18;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const RIM_COLOR = '#F9BDAF';
const CORE_COLOR = '#FFF7F2';
const PRIMARY_COLOR = '#F0815B';
const MULBERRY_COLOR = '#54086F';
const PLUM_COLOR = '#744D7C';
const AVATAR_OFFSET = 0.1;
const DRAG_SENSITIVITY = 0.0062;
const TOUCH_DRAG_SENSITIVITY = 0.0074;
const ROTATION_DAMPING = 4.8;
const AUTO_ROTATION_DELAY = 0.9;
const AUTO_ROTATION_RAMP = 1.15;
const MIN_ROTATION_X = -0.72;
const MAX_ROTATION_X = 0.44;

const NETWORK_LINE_VERTEX_SHADER = `
  varying float vFrontness;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float cameraDepth = -viewPosition.z;
    vFrontness = 1.0 - smoothstep(7.4, 14.2, cameraDepth);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const NETWORK_LINE_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFrontness;

  void main() {
    float depthAlpha = mix(0.12, 1.0, smoothstep(0.05, 0.92, vFrontness));
    gl_FragColor = vec4(uColor, uOpacity * depthAlpha);
  }
`;

const RIM_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const RIM_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 2.35);
    vec3 peach = vec3(0.941, 0.506, 0.357);
    vec3 plum = vec3(0.329, 0.031, 0.435);
    vec3 rimColor = mix(peach, plum, smoothstep(0.35, 1.0, fresnel));
    gl_FragColor = vec4(rimColor, fresnel * 0.13);
  }
`;

type RotationInteraction = {
  active: boolean;
  pointerId: number | null;
  pointerType: string;
  lastX: number;
  lastY: number;
  lastTimestamp: number;
  velocityX: number;
  velocityY: number;
  idleTime: number;
};

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

function orderNodesForShowcase(nodes: NodeSpec[]) {
  return [...nodes].sort((left, right) => {
    const scoreDifference = nodeShowcaseScore(right) - nodeShowcaseScore(left);
    if (scoreDifference !== 0) return scoreDifference;
    return left.id.localeCompare(right.id);
  });
}

function selectPlayersForDisplay(players: HeroVerifiedPlayer[], seed: number) {
  const playersWithAvatar = seededShuffle(
    players.filter((player) => hasDisplayAvatar(player)),
    seed ^ 0xc2b2ae35
  );
  const playersWithoutAvatar = seededShuffle(
    players.filter((player) => !hasDisplayAvatar(player)),
    seed ^ 0x27d4eb2f
  );

  return [...playersWithAvatar, ...playersWithoutAvatar].slice(0, DISPLAY_NODE_COUNT);
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
      size: index % 6 === 0 ? 0.046 : 0.034,
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
      size: index % 5 === 0 ? 0.04 : 0.03,
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
    if (index % 4 !== 0) return;

    const nearestOuterNode = outerNodes
      .map((outerNode) => ({
        outerNode,
        distance: distanceBetween(innerNode, outerNode),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 1);

    nearestOuterNode.forEach(({ outerNode, distance }) => {
      if (distance > 2.35) return;
      positions.push(...innerNode.position, ...outerNode.position);
    });
  });

  return new Float32Array(positions);
}

const NETWORK_DATA = (() => {
  const outerNodes = createOuterNodes();
  const innerNodes = createInnerNodes();
  const displayNodes = orderNodesForShowcase([
    ...outerNodes.filter((_, index) => index % 2 === 0),
    ...innerNodes.filter((_, index) => index % 2 === 0),
  ]);

  return {
    outerNodes,
    innerNodes,
    displayNodes,
    outerSegments: buildSegments(outerNodes, 2, 1.9, 0.55),
    innerSegments: buildSegments(innerNodes, 2, 2.2, 0.55),
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
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    }),
    [color, opacity]
  );

  return (
    <lineSegments scale={scale} renderOrder={1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={NETWORK_LINE_VERTEX_SHADER}
        fragmentShader={NETWORK_LINE_FRAGMENT_SHADER}
      />
    </lineSegments>
  );
}

function SceneReady({ onReady }: { onReady?: () => void }) {
  const hasReportedReady = useRef(false);
  const renderedFrameCount = useRef(0);

  useFrame(() => {
    renderedFrameCount.current += 1;
    if (hasReportedReady.current || renderedFrameCount.current < 2) return;
    hasReportedReady.current = true;
    onReady?.();
  });

  return null;
}

function NetworkNodes({
  nodes,
  activeNodeIds,
  assignedPlayerByNodeId,
  htmlPortalRef,
}: {
  nodes: NodeSpec[];
  activeNodeIds: Set<string>;
  assignedPlayerByNodeId: Map<string, HeroVerifiedPlayer>;
  htmlPortalRef: RefObject<HTMLElement>;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isOuter = node.kind === 'outer';
        const isActive = activeNodeIds.has(node.id);
        const player = assignedPlayerByNodeId.get(node.id) ?? null;
        const coreColor = isOuter ? CORE_COLOR : isActive ? PRIMARY_COLOR : RIM_COLOR;
        const haloColor = isActive ? PRIMARY_COLOR : isOuter ? RIM_COLOR : PLUM_COLOR;
        const emissiveIntensity = isActive ? 0.9 : isOuter ? 0.48 : 0.34;
        const avatarOffset = new THREE.Vector3(...node.position)
          .normalize()
          .multiplyScalar(AVATAR_OFFSET);

        return (
          <group key={node.id} position={node.position}>
            {!player ? (
              <mesh>
                <sphereGeometry args={isActive ? [node.size * 1.12, 10, 10] : [node.size, 8, 8]} />
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
              <DepthAwareAvatar
                avatarOffset={toTuple(avatarOffset)}
                node={node}
                player={player}
                highlighted={isActive}
                htmlPortalRef={htmlPortalRef}
              />
            ) : null}
          </group>
        );
      })}
    </>
  );
}

function DepthAwareAvatar({
  avatarOffset,
  node,
  player,
  highlighted,
  htmlPortalRef,
}: {
  avatarOffset: [number, number, number];
  node: NodeSpec;
  player: HeroVerifiedPlayer;
  highlighted: boolean;
  htmlPortalRef: RefObject<HTMLElement>;
}) {
  const anchorRef = useRef<THREE.Group | null>(null);
  const htmlRef = useRef<HTMLDivElement | null>(null);
  const worldPositionRef = useRef(new THREE.Vector3());
  const cameraVectorRef = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    const anchor = anchorRef.current;
    const html = htmlRef.current;
    if (!anchor || !html) return;

    const worldPosition = anchor.getWorldPosition(worldPositionRef.current);
    const cameraVector = cameraVectorRef.current.copy(camera.position).normalize();
    const frontness = worldPosition.normalize().dot(cameraVector);
    const visibility = THREE.MathUtils.smoothstep(frontness, -0.18, 0.28);
    const opacity = THREE.MathUtils.lerp(0.035, 1, visibility);

    html.style.opacity = opacity.toFixed(3);
  });

  return (
    <group ref={anchorRef} position={avatarOffset}>
      <Html
        ref={htmlRef}
        center
        portal={htmlPortalRef}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'auto', willChange: 'opacity' }}
      >
        <AvatarBadge node={node} player={player} highlighted={highlighted} />
      </Html>
    </group>
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
  const size = isOuter ? 30 : 26;
  const ringColor = MULBERRY_COLOR;
  const glowColor = highlighted ? 'rgba(84,8,111,0.22)' : 'rgba(84,8,111,0.14)';

  const avatar = (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-110"
      style={{
        width: size,
        height: size,
        border: '1px solid rgba(84,8,111,0.42)',
        background:
          player.avatarUrl && !imageFailed
            ? 'rgba(255,255,255,0.94)'
            : 'radial-gradient(circle at 30% 30%, rgba(255,247,242,0.98), rgba(249,189,175,0.92) 52%, rgba(116,77,124,0.88) 100%)',
        boxShadow: `0 0 0 1px ${ringColor}, 0 6px 16px -8px ${glowColor}`,
        backdropFilter: 'blur(8px)',
      }}
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
        <span
          className="font-eastman-bold text-[8px] tracking-[0.08em]"
          style={{ color: highlighted ? '#FFF7F2' : isOuter ? MULBERRY_COLOR : '#FFF7F2' }}
        >
          {player.initials}
        </span>
      )}
    </div>
  );

  if (!player.profileHandle) {
    return (
      <span
        className="group cursor-ball relative block rounded-full"
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
      className="group cursor-ball-action relative block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {avatar}
      <HeroPlayerHoverCard player={player} />
    </Link>
  );
}

function SoccerBallNetwork({
  players,
  htmlPortalRef,
}: Pick<HeroSoccerBallProps, 'players'> & { htmlPortalRef: RefObject<HTMLElement> }) {
  const rotationRef = useRef<THREE.Group | null>(null);
  const ambientMotionRef = useRef<THREE.Group | null>(null);
  const interactionRef = useRef<RotationInteraction>({
    active: false,
    pointerId: null,
    pointerType: '',
    lastX: 0,
    lastY: 0,
    lastTimestamp: 0,
    velocityX: 0,
    velocityY: 0,
    idleTime: AUTO_ROTATION_DELAY + AUTO_ROTATION_RAMP,
  });
  const [displaySeed] = useState(() => Math.floor(Math.random() * 0xffffffff));
  const displayPlayers = useMemo(
    () => selectPlayersForDisplay(players, displaySeed),
    [players, displaySeed]
  );
  const assignedPlayerByNodeId = useMemo(() => {
    const assignments = new Map<string, HeroVerifiedPlayer>();
    if (!displayPlayers.length) return assignments;

    const limit = Math.min(displayPlayers.length, NETWORK_DATA.displayNodes.length);

    for (let index = 0; index < limit; index += 1) {
      assignments.set(NETWORK_DATA.displayNodes[index].id, displayPlayers[index]);
    }

    return assignments;
  }, [displayPlayers]);
  const activeNodeIds = useMemo(() => {
    if (assignedPlayerByNodeId.size > 0) {
      return new Set(Array.from(assignedPlayerByNodeId.keys()));
    }

    return new Set(NETWORK_DATA.displayNodes.slice(0, 12).map((node) => node.id));
  }, [assignedPlayerByNodeId]);

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.stopPropagation();
    const interaction = interactionRef.current;
    interaction.active = true;
    interaction.pointerId = event.pointerId;
    interaction.pointerType = event.pointerType;
    interaction.lastX = event.clientX;
    interaction.lastY = event.clientY;
    interaction.lastTimestamp = event.timeStamp;
    interaction.velocityX = 0;
    interaction.velocityY = 0;
    interaction.idleTime = 0;

    const target = event.nativeEvent.target;
    if (target instanceof Element) {
      target.setPointerCapture(event.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    const interaction = interactionRef.current;
    const rotation = rotationRef.current;

    if (!interaction.active || interaction.pointerId !== event.pointerId || !rotation) return;

    event.stopPropagation();
    const deltaX = event.clientX - interaction.lastX;
    const deltaY = interaction.pointerType === 'touch' ? 0 : event.clientY - interaction.lastY;
    const elapsedSeconds = Math.max((event.timeStamp - interaction.lastTimestamp) / 1000, 1 / 120);
    const sensitivity =
      interaction.pointerType === 'touch' ? TOUCH_DRAG_SENSITIVITY : DRAG_SENSITIVITY;
    const rotationDeltaX = deltaY * sensitivity;
    const rotationDeltaY = deltaX * sensitivity;

    rotation.rotation.x = THREE.MathUtils.clamp(
      rotation.rotation.x + rotationDeltaX,
      MIN_ROTATION_X,
      MAX_ROTATION_X
    );
    rotation.rotation.y += rotationDeltaY;
    interaction.velocityX = THREE.MathUtils.lerp(
      interaction.velocityX,
      THREE.MathUtils.clamp(rotationDeltaX / elapsedSeconds, -4.5, 4.5),
      0.46
    );
    interaction.velocityY = THREE.MathUtils.lerp(
      interaction.velocityY,
      THREE.MathUtils.clamp(rotationDeltaY / elapsedSeconds, -4.5, 4.5),
      0.46
    );
    interaction.lastX = event.clientX;
    interaction.lastY = event.clientY;
    interaction.lastTimestamp = event.timeStamp;
    interaction.idleTime = 0;
  }, []);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    const interaction = interactionRef.current;
    if (!interaction.active || interaction.pointerId !== event.pointerId) return;

    event.stopPropagation();
    interaction.active = false;
    interaction.pointerId = null;
    interaction.idleTime = 0;

    const target = event.nativeEvent.target;
    if (target instanceof Element && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handlePointerCancel = useCallback((event: ThreeEvent<PointerEvent>) => {
    const interaction = interactionRef.current;
    if (!interaction.active || interaction.pointerId !== event.pointerId) return;

    interaction.active = false;
    interaction.pointerId = null;
    interaction.velocityX = 0;
    interaction.velocityY = 0;
    interaction.idleTime = 0;
  }, []);

  useFrame((state, delta) => {
    const rotation = rotationRef.current;
    const ambientMotion = ambientMotionRef.current;
    if (!rotation || !ambientMotion) return;

    const elapsed = state.clock.getElapsedTime();
    ambientMotion.rotation.x = THREE.MathUtils.lerp(
      ambientMotion.rotation.x,
      Math.sin(elapsed * 0.38) * 0.035,
      0.04
    );
    ambientMotion.rotation.z = THREE.MathUtils.lerp(
      ambientMotion.rotation.z,
      Math.sin(elapsed * 0.26) * 0.04,
      0.04
    );

    const interaction = interactionRef.current;
    if (interaction.active) return;

    interaction.idleTime += delta;
    rotation.rotation.x = THREE.MathUtils.clamp(
      rotation.rotation.x + interaction.velocityX * delta,
      MIN_ROTATION_X,
      MAX_ROTATION_X
    );
    rotation.rotation.y += interaction.velocityY * delta;

    const damping = Math.exp(-ROTATION_DAMPING * delta);
    interaction.velocityX *= damping;
    interaction.velocityY *= damping;

    if (Math.abs(interaction.velocityX) < 0.002) interaction.velocityX = 0;
    if (Math.abs(interaction.velocityY) < 0.002) interaction.velocityY = 0;

    const autoRotationStrength = THREE.MathUtils.smoothstep(
      interaction.idleTime,
      AUTO_ROTATION_DELAY,
      AUTO_ROTATION_DELAY + AUTO_ROTATION_RAMP
    );
    rotation.rotation.y += delta * 0.12 * autoRotationStrength;
  });

  return (
    <group ref={rotationRef} rotation={[-0.18, 0, 0]}>
      <group ref={ambientMotionRef} scale={NETWORK_SCALE}>
        <mesh
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handlePointerCancel}
        >
          <sphereGeometry args={[3.72, 20, 20]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>

        <mesh>
          <sphereGeometry args={[3.04, 36, 36]} />
          <meshPhysicalMaterial
            color="#FFF9F6"
            transparent
            opacity={0.035}
            roughness={0.42}
            metalness={0.04}
            clearcoat={0.4}
            clearcoatRoughness={0.5}
            depthWrite={false}
          />
        </mesh>

        <mesh scale={1.018} renderOrder={2}>
          <sphereGeometry args={[3.04, 36, 36]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            vertexShader={RIM_VERTEX_SHADER}
            fragmentShader={RIM_FRAGMENT_SHADER}
          />
        </mesh>

        <NetworkLines positions={NETWORK_DATA.outerSegments} color={RIM_COLOR} opacity={0.22} />
        <NetworkLines
          positions={NETWORK_DATA.innerSegments}
          color={PLUM_COLOR}
          opacity={0.1}
        />
        <NetworkLines
          positions={NETWORK_DATA.bridgeSegments}
          color={PRIMARY_COLOR}
          opacity={0.1}
        />

        <NetworkNodes
          nodes={NETWORK_DATA.outerNodes}
          activeNodeIds={activeNodeIds}
          assignedPlayerByNodeId={assignedPlayerByNodeId}
          htmlPortalRef={htmlPortalRef}
        />
        <NetworkNodes
          nodes={NETWORK_DATA.innerNodes}
          activeNodeIds={activeNodeIds}
          assignedPlayerByNodeId={assignedPlayerByNodeId}
          htmlPortalRef={htmlPortalRef}
        />
      </group>
    </group>
  );
}

export default function HeroSoccerBall({ players, onReady }: HeroSoccerBallProps) {
  const htmlPortalRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex min-h-[330px] w-full items-center justify-center sm:min-h-[400px] lg:min-h-[480px]">
      <div className="pointer-events-none absolute inset-[19%] rounded-full bg-[radial-gradient(circle_at_center,rgba(240,129,91,0.1),rgba(84,8,111,0.05)_54%,rgba(255,255,255,0)_76%)] blur-2xl" />

      <div
        ref={htmlPortalRef}
        className="relative z-[1] aspect-square w-full max-w-[23rem] overflow-visible sm:max-w-[27rem] lg:max-w-[30rem]"
      >
        <Canvas
          dpr={[1, 1.35]}
          performance={{ min: 0.7 }}
          camera={{ position: [0, 0, 10.9], fov: 32 }}
          gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
          className="h-full w-full"
          style={{ touchAction: 'pan-y' }}
        >
          <SceneReady onReady={onReady} />
          <ambientLight intensity={0.62} />
          <pointLight position={[6.5, 6, 8]} intensity={55} color="#fff7f3" />
          <pointLight position={[-6, -4, -7]} intensity={34} color="#dcb3ea" />
          <pointLight position={[0, 0, 6]} intensity={26} color="#f59e7b" />
          <directionalLight position={[0, 5, 4]} intensity={1.45} color="#ffffff" />
          <SoccerBallNetwork players={players} htmlPortalRef={htmlPortalRef} />
        </Canvas>
      </div>
    </div>
  );
}
